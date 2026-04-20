"""
Generates realistic sample data for RetroGuard demo.
~200 assets across 5 Indian highways, with historical measurements,
alerts, and maintenance orders.
"""

import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models import HighwayAsset, Measurement, Alert, MaintenanceOrder

random.seed(42)

# ── Highway corridor waypoints (lat, lon) ───────────────────────────────────
# Each highway has a series of waypoints; assets are interpolated along them.

HIGHWAYS = {
    "NH-48": {
        "name": "Mumbai-Ahmedabad",
        "waypoints": [
            (19.0760, 72.8777),   # Mumbai
            (19.2960, 72.8547),   # Dahisar
            (19.8300, 72.7800),   # Virar
            (20.1800, 72.8300),   # Vapi
            (20.6300, 72.9900),   # Navsari
            (21.1700, 72.8311),   # Surat
            (21.7600, 72.1500),   # Bharuch
            (22.3100, 73.1800),   # Vadodara
            (22.7200, 72.6600),   # Anand
            (23.0225, 72.5714),   # Ahmedabad
        ],
    },
    "NH-44": {
        "name": "Delhi-Chennai (partial)",
        "waypoints": [
            (28.6139, 77.2090),   # Delhi
            (28.4089, 77.3178),   # Faridabad
            (27.1767, 78.0081),   # Agra
            (26.8467, 80.9462),   # Lucknow (route passes nearby)
            (26.4499, 80.3319),   # Kanpur
            (25.3176, 82.9739),   # Varanasi
            (23.2599, 77.4126),   # Bhopal
            (21.1458, 79.0882),   # Nagpur
            (17.3850, 78.4867),   # Hyderabad
            (13.0827, 80.2707),   # Chennai
        ],
    },
    "NH-27": {
        "name": "East-West Corridor",
        "waypoints": [
            (26.7606, 83.3732),   # Gorakhpur
            (26.4499, 80.3319),   # Kanpur
            (26.8500, 80.9100),   # Lucknow
            (26.9124, 75.7873),   # Jaipur
            (23.0225, 72.5714),   # Ahmedabad
            (22.7196, 75.8577),   # Indore
            (21.2514, 81.6296),   # Raipur
            (22.8046, 86.2029),   # Jamshedpur
            (22.5726, 88.3639),   # Kolkata
            (26.1445, 91.7362),   # Guwahati
        ],
    },
    "NH-66": {
        "name": "Mumbai-Goa",
        "waypoints": [
            (19.0760, 72.8777),   # Mumbai
            (18.5204, 73.8567),   # Pune (nearby)
            (17.6868, 73.3206),   # Ratnagiri
            (16.8524, 73.7154),   # Kankavali
            (15.8497, 73.8194),   # Mapusa
            (15.4909, 73.8278),   # Panaji
            (15.2993, 74.1240),   # Margao
            (14.8561, 74.0048),   # Karwar
            (13.9299, 74.5869),   # Udupi
            (12.9141, 74.8560),   # Mangalore
        ],
    },
    "DME": {
        "name": "Delhi-Mumbai Expressway",
        "waypoints": [
            (28.5500, 77.1500),   # Delhi (Dwarka)
            (28.0200, 76.5100),   # Manesar
            (27.2046, 77.4977),   # Bharatpur
            (26.9124, 75.7873),   # Jaipur
            (25.4358, 74.6293),   # Chittorgarh
            (24.5854, 73.7125),   # Udaipur
            (23.2599, 77.4126),   # Bhopal
            (22.7196, 75.8577),   # Indore
            (21.1458, 79.0882),   # Nagpur (nearby)
            (20.5937, 73.6900),   # Near Vapi
            (19.0760, 72.8777),   # Mumbai
        ],
    },
}

# ── Asset type configurations (IRC 67 / IRC 35 based) ───────────────────────

ASSET_CONFIGS = {
    "sign_white_iii": {
        "asset_type": "sign",
        "material_grade": "Type III Retroreflective (White)",
        "irc_minimum_rl": 120.0,
        "new_rl_range": (180, 250),
        "degraded_rl_range": (80, 130),
    },
    "sign_yellow": {
        "asset_type": "sign",
        "material_grade": "Type III Retroreflective (Yellow)",
        "irc_minimum_rl": 65.0,
        "new_rl_range": (100, 170),
        "degraded_rl_range": (40, 75),
    },
    "sign_green": {
        "asset_type": "sign",
        "material_grade": "Type IX Retroreflective (Green)",
        "irc_minimum_rl": 45.0,
        "new_rl_range": (70, 130),
        "degraded_rl_range": (25, 55),
    },
    "marking_white": {
        "asset_type": "marking",
        "material_grade": "Thermoplastic White",
        "irc_minimum_rl": 150.0,
        "new_rl_range": (250, 400),
        "degraded_rl_range": (100, 170),
    },
    "marking_yellow": {
        "asset_type": "marking",
        "material_grade": "Thermoplastic Yellow",
        "irc_minimum_rl": 120.0,
        "new_rl_range": (200, 350),
        "degraded_rl_range": (80, 140),
    },
    "rpm": {
        "asset_type": "rpm",
        "material_grade": "Raised Pavement Marker",
        "irc_minimum_rl": 5.0,
        "new_rl_range": (8, 15),
        "degraded_rl_range": (2, 6),
    },
    "delineator": {
        "asset_type": "delineator",
        "material_grade": "Type I Delineator",
        "irc_minimum_rl": 50.0,
        "new_rl_range": (80, 150),
        "degraded_rl_range": (30, 60),
    },
}

ORIENTATIONS = ["left", "right", "overhead", "median", "center"]
SOURCE_LAYERS = ["smartphone", "cctv", "dashcam", "qr_code"]


def _interpolate_point(waypoints, t):
    """Interpolate a point along the waypoint chain. t in [0, 1]."""
    n = len(waypoints) - 1
    segment = min(int(t * n), n - 1)
    local_t = (t * n) - segment
    lat1, lon1 = waypoints[segment]
    lat2, lon2 = waypoints[segment + 1]
    lat = lat1 + (lat2 - lat1) * local_t
    lon = lon1 + (lon2 - lon1) * local_t
    # Add small random offset to avoid exact overlap
    lat += random.uniform(-0.005, 0.005)
    lon += random.uniform(-0.005, 0.005)
    return round(lat, 6), round(lon, 6)


def _decide_status_and_rl(config, target_status):
    """Pick an RL value matching the desired status."""
    irc_min = config["irc_minimum_rl"]
    if target_status == "compliant":
        # RL is >= 1.2 * irc_min
        low = irc_min * 1.2
        high = config["new_rl_range"][1]
        rl = round(random.uniform(low, high), 1)
    elif target_status == "warning":
        # RL is between 1.0 and 1.2 * irc_min
        low = irc_min * 1.0
        high = irc_min * 1.2
        rl = round(random.uniform(low, high), 1)
    else:  # critical
        low = config["degraded_rl_range"][0]
        high = irc_min * 0.99
        rl = round(random.uniform(low, high), 1)
    return rl


def _generate_measurement_history(asset, config, num_measurements):
    """Create a series of measurements showing realistic degradation."""
    measurements = []
    now = datetime.utcnow()
    start_date = now - timedelta(days=180)

    # Start RL (higher when newer) and degrade toward current
    start_rl = random.uniform(config["new_rl_range"][0], config["new_rl_range"][1])
    end_rl = asset.current_rl

    for i in range(num_measurements):
        frac = i / max(num_measurements - 1, 1)
        # Linear degradation with noise
        base_rl = start_rl + (end_rl - start_rl) * frac
        noise = random.uniform(-5, 5) * (config["irc_minimum_rl"] / 100)
        rl = round(max(base_rl + noise, 1.0), 1)

        days_offset = int(frac * 175)
        measured_at = start_date + timedelta(
            days=days_offset,
            hours=random.randint(6, 20),
            minutes=random.randint(0, 59),
        )

        m = Measurement(
            asset_id=asset.id,
            rl_value=rl,
            confidence=round(random.uniform(0.75, 0.98), 2),
            source_layer=random.choice(SOURCE_LAYERS),
            conditions_json='{"weather":"clear","ambient_light":"daylight"}' if random.random() > 0.3 else '{"weather":"overcast","ambient_light":"low"}',
            device_info=random.choice([
                "Pixel 7 Pro + RetroGuard App v1.2",
                "iPhone 14 Pro + RetroGuard App v1.1",
                "Hikvision DS-2CD CCTV",
                "Dashcam Viofo A129 Pro",
                "Samsung Galaxy S23 + QR Scanner",
            ]),
            measured_at=measured_at,
            image_path=f"/images/asset_{asset.id}/measurement_{i+1}.jpg",
        )
        measurements.append(m)

    return measurements


def seed(db: Session):
    """Main seeding function. Idempotent: only runs if DB is empty."""
    existing = db.query(HighwayAsset).count()
    if existing > 0:
        return False  # Already seeded

    print("[seed] Generating RetroGuard demo data...")

    # Distribution of statuses
    status_choices = (
        ["compliant"] * 70
        + ["warning"] * 18
        + ["critical"] * 12
    )

    config_keys = list(ASSET_CONFIGS.keys())
    highway_ids = list(HIGHWAYS.keys())

    # Target ~200 assets, spread across 5 highways (~40 each)
    assets_per_highway = 40
    all_assets = []
    all_measurements = []

    for hw_id in highway_ids:
        hw = HIGHWAYS[hw_id]
        waypoints = hw["waypoints"]
        total_chainage = random.uniform(300, 800)  # approximate km

        for i in range(assets_per_highway):
            t = (i + random.uniform(0.1, 0.9)) / assets_per_highway
            lat, lon = _interpolate_point(waypoints, t)
            chainage = round(t * total_chainage, 1)

            config_key = random.choice(config_keys)
            config = ASSET_CONFIGS[config_key]
            status = random.choice(status_choices)
            current_rl = _decide_status_and_rl(config, status)

            install_days_ago = random.randint(180, 1800)
            installation_date = datetime.utcnow() - timedelta(days=install_days_ago)

            # Predicted failure for warning/critical assets
            predicted_failure = None
            if status == "warning":
                predicted_failure = datetime.utcnow() + timedelta(days=random.randint(30, 120))
            elif status == "critical":
                predicted_failure = datetime.utcnow() + timedelta(days=random.randint(0, 30))

            asset = HighwayAsset(
                asset_type=config["asset_type"],
                highway_id=hw_id,
                chainage_km=chainage,
                gps_lat=lat,
                gps_lon=lon,
                material_grade=config["material_grade"],
                installation_date=installation_date,
                orientation=random.choice(ORIENTATIONS),
                current_rl=current_rl,
                irc_minimum_rl=config["irc_minimum_rl"],
                status=status,
                last_measured=datetime.utcnow() - timedelta(days=random.randint(0, 14)),
                predicted_failure_date=predicted_failure,
            )
            all_assets.append((asset, config_key))

    # Bulk add assets first to get IDs
    db.add_all([a for a, _ in all_assets])
    db.flush()

    # Generate measurements for each asset
    for asset, config_key in all_assets:
        config = ASSET_CONFIGS[config_key]
        num = random.randint(6, 12)
        measurements = _generate_measurement_history(asset, config, num)
        all_measurements.extend(measurements)

    db.add_all(all_measurements)
    db.flush()

    # Generate alerts for critical and warning assets
    alert_assets = [a for a, _ in all_assets if a.status in ("critical", "warning")]
    random.shuffle(alert_assets)
    alerts = []
    for asset in alert_assets[:15]:
        alert_type = "critical" if asset.status == "critical" else "warning"
        if alert_type == "critical":
            msg = (
                f"CRITICAL: {asset.asset_type.title()} on {asset.highway_id} at km {asset.chainage_km} "
                f"has RL {asset.current_rl:.1f}, below IRC minimum {asset.irc_minimum_rl:.1f}. "
                f"Immediate replacement recommended."
            )
        else:
            msg = (
                f"WARNING: {asset.asset_type.title()} on {asset.highway_id} at km {asset.chainage_km} "
                f"RL {asset.current_rl:.1f} approaching threshold {asset.irc_minimum_rl:.1f}. "
                f"Schedule inspection within 30 days."
            )
        alerts.append(
            Alert(
                asset_id=asset.id,
                alert_type=alert_type,
                message=msg,
                highway_id=asset.highway_id,
                chainage_km=asset.chainage_km,
                is_resolved=False,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
            )
        )
    db.add_all(alerts)

    # Generate maintenance orders
    critical_assets = [a for a, _ in all_assets if a.status == "critical"]
    random.shuffle(critical_assets)
    orders = []
    statuses = ["pending"] * 5 + ["scheduled"] * 3 + ["completed"] * 2
    for idx, asset in enumerate(critical_assets[:10]):
        order_status = statuses[idx] if idx < len(statuses) else "pending"
        scheduled_date = None
        if order_status in ("scheduled", "completed"):
            scheduled_date = datetime.utcnow() + timedelta(days=random.randint(1, 30))
        orders.append(
            MaintenanceOrder(
                asset_id=asset.id,
                priority_score=round(random.uniform(7.0, 10.0), 1),
                status=order_status,
                scheduled_date=scheduled_date,
                notes=random.choice([
                    "Replace retroreflective sheeting with Type IX material",
                    "Full sign board replacement required",
                    "Re-apply thermoplastic marking with glass beads",
                    "Replace damaged RPM units",
                    "Delineator post realignment and sheeting replacement",
                    "Clean and reassess after monsoon season",
                    "Priority: near school zone, expedite replacement",
                    "Coordinate with toll plaza maintenance team",
                ]),
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 14)),
            )
        )
    db.add_all(orders)

    db.commit()
    total_assets = db.query(HighwayAsset).count()
    total_measurements = db.query(Measurement).count()
    total_alerts = db.query(Alert).count()
    total_orders = db.query(MaintenanceOrder).count()
    print(f"[seed] Created {total_assets} assets, {total_measurements} measurements, "
          f"{total_alerts} alerts, {total_orders} maintenance orders.")
    return True
