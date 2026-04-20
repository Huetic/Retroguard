import { MapAsset } from "../components/MapComponent";
import { AlertData } from "../components/AlertCard";

// ------- Highway Assets -------
export const mapAssets: MapAsset[] = [
  // NH-48 Mumbai-Ahmedabad (9 points)
  { id: "NH48-001", type: "Regulatory Sign", highway: "NH-48", chainage: "KM 0+200", lat: 19.076, lng: 72.878, currentRL: 165, ircMin: 120, status: "compliant", lastMeasured: "2026-03-28" },
  { id: "NH48-002", type: "Road Marking", highway: "NH-48", chainage: "KM 12+500", lat: 19.280, lng: 72.865, currentRL: 142, ircMin: 120, status: "compliant", lastMeasured: "2026-03-25" },
  { id: "NH48-003", type: "Guide Sign", highway: "NH-48", chainage: "KM 45+800", lat: 19.750, lng: 72.960, currentRL: 118, ircMin: 120, status: "warning", lastMeasured: "2026-03-20" },
  { id: "NH48-004", type: "Chevron Marker", highway: "NH-48", chainage: "KM 78+100", lat: 20.005, lng: 73.015, currentRL: 157, ircMin: 120, status: "compliant", lastMeasured: "2026-03-18" },
  { id: "NH48-005", type: "Warning Sign", highway: "NH-48", chainage: "KM 120+400", lat: 20.550, lng: 72.980, currentRL: 89, ircMin: 120, status: "critical", lastMeasured: "2026-03-15" },
  { id: "NH48-006", type: "Delineator Post", highway: "NH-48", chainage: "KM 165+700", lat: 21.170, lng: 72.831, currentRL: 134, ircMin: 120, status: "compliant", lastMeasured: "2026-03-12" },
  { id: "NH48-007", type: "Regulatory Sign", highway: "NH-48", chainage: "KM 210+200", lat: 21.765, lng: 72.153, currentRL: 112, ircMin: 120, status: "warning", lastMeasured: "2026-03-10" },
  { id: "NH48-008", type: "Road Marking", highway: "NH-48", chainage: "KM 255+900", lat: 22.307, lng: 73.181, currentRL: 148, ircMin: 120, status: "compliant", lastMeasured: "2026-03-08" },
  { id: "NH48-009", type: "Guide Sign", highway: "NH-48", chainage: "KM 300+100", lat: 23.022, lng: 72.571, currentRL: 155, ircMin: 120, status: "compliant", lastMeasured: "2026-03-05" },

  // NH-44 Delhi-Chennai (9 points)
  { id: "NH44-001", type: "Warning Sign", highway: "NH-44", chainage: "KM 0+500", lat: 28.614, lng: 77.209, currentRL: 161, ircMin: 120, status: "compliant", lastMeasured: "2026-04-01" },
  { id: "NH44-002", type: "Regulatory Sign", highway: "NH-44", chainage: "KM 80+200", lat: 27.876, lng: 77.125, currentRL: 95, ircMin: 120, status: "critical", lastMeasured: "2026-03-28" },
  { id: "NH44-003", type: "Road Marking", highway: "NH-44", chainage: "KM 160+700", lat: 27.177, lng: 78.015, currentRL: 138, ircMin: 120, status: "compliant", lastMeasured: "2026-03-25" },
  { id: "NH44-004", type: "Guide Sign", highway: "NH-44", chainage: "KM 310+400", lat: 26.449, lng: 80.331, currentRL: 115, ircMin: 120, status: "warning", lastMeasured: "2026-03-22" },
  { id: "NH44-005", type: "Chevron Marker", highway: "NH-44", chainage: "KM 480+100", lat: 25.432, lng: 81.846, currentRL: 152, ircMin: 120, status: "compliant", lastMeasured: "2026-03-20" },
  { id: "NH44-006", type: "Delineator Post", highway: "NH-44", chainage: "KM 700+800", lat: 23.259, lng: 77.412, currentRL: 108, ircMin: 120, status: "warning", lastMeasured: "2026-03-18" },
  { id: "NH44-007", type: "Warning Sign", highway: "NH-44", chainage: "KM 950+200", lat: 21.146, lng: 79.088, currentRL: 78, ircMin: 120, status: "critical", lastMeasured: "2026-03-15" },
  { id: "NH44-008", type: "Regulatory Sign", highway: "NH-44", chainage: "KM 1200+500", lat: 17.385, lng: 78.487, currentRL: 143, ircMin: 120, status: "compliant", lastMeasured: "2026-03-12" },
  { id: "NH44-009", type: "Road Marking", highway: "NH-44", chainage: "KM 1460+100", lat: 13.082, lng: 80.271, currentRL: 131, ircMin: 120, status: "compliant", lastMeasured: "2026-03-10" },

  // NH-66 Mumbai-Goa (6 points)
  { id: "NH66-001", type: "Regulatory Sign", highway: "NH-66", chainage: "KM 0+300", lat: 19.076, lng: 72.878, currentRL: 159, ircMin: 120, status: "compliant", lastMeasured: "2026-03-30" },
  { id: "NH66-002", type: "Guide Sign", highway: "NH-66", chainage: "KM 55+800", lat: 18.520, lng: 73.068, currentRL: 114, ircMin: 120, status: "warning", lastMeasured: "2026-03-27" },
  { id: "NH66-003", type: "Road Marking", highway: "NH-66", chainage: "KM 140+200", lat: 17.685, lng: 73.296, currentRL: 167, ircMin: 120, status: "compliant", lastMeasured: "2026-03-24" },
  { id: "NH66-004", type: "Warning Sign", highway: "NH-66", chainage: "KM 210+500", lat: 16.994, lng: 73.300, currentRL: 82, ircMin: 120, status: "critical", lastMeasured: "2026-03-21" },
  { id: "NH66-005", type: "Delineator Post", highway: "NH-66", chainage: "KM 360+100", lat: 15.491, lng: 73.818, currentRL: 145, ircMin: 120, status: "compliant", lastMeasured: "2026-03-18" },
  { id: "NH66-006", type: "Chevron Marker", highway: "NH-66", chainage: "KM 400+700", lat: 15.299, lng: 73.954, currentRL: 117, ircMin: 120, status: "warning", lastMeasured: "2026-03-15" },

  // NH-27 (Ahmedabad-Jaipur-Lucknow)
  { id: "NH27-001", type: "Regulatory Sign", highway: "NH-27", chainage: "KM 5+200", lat: 23.033, lng: 72.585, currentRL: 154, ircMin: 120, status: "compliant", lastMeasured: "2026-04-02" },
  { id: "NH27-002", type: "Road Marking", highway: "NH-27", chainage: "KM 80+400", lat: 23.590, lng: 72.365, currentRL: 128, ircMin: 120, status: "compliant", lastMeasured: "2026-03-30" },
  { id: "NH27-003", type: "Guide Sign", highway: "NH-27", chainage: "KM 170+100", lat: 24.178, lng: 72.819, currentRL: 101, ircMin: 120, status: "critical", lastMeasured: "2026-03-27" },
  { id: "NH27-004", type: "Warning Sign", highway: "NH-27", chainage: "KM 290+600", lat: 24.882, lng: 74.630, currentRL: 119, ircMin: 120, status: "warning", lastMeasured: "2026-03-24" },
  { id: "NH27-005", type: "Chevron Marker", highway: "NH-27", chainage: "KM 400+200", lat: 25.612, lng: 75.143, currentRL: 163, ircMin: 120, status: "compliant", lastMeasured: "2026-03-21" },
  { id: "NH27-006", type: "Delineator Post", highway: "NH-27", chainage: "KM 510+800", lat: 26.283, lng: 73.024, currentRL: 137, ircMin: 120, status: "compliant", lastMeasured: "2026-03-18" },
  { id: "NH27-007", type: "Road Marking", highway: "NH-27", chainage: "KM 600+300", lat: 26.912, lng: 75.787, currentRL: 146, ircMin: 120, status: "compliant", lastMeasured: "2026-03-15" },
  { id: "NH27-008", type: "Regulatory Sign", highway: "NH-27", chainage: "KM 720+100", lat: 26.850, lng: 80.949, currentRL: 113, ircMin: 120, status: "warning", lastMeasured: "2026-03-12" },

  // DME (Delhi-Meerut Expressway)
  { id: "DME-001", type: "Regulatory Sign", highway: "DME", chainage: "KM 2+100", lat: 28.680, lng: 77.215, currentRL: 172, ircMin: 120, status: "compliant", lastMeasured: "2026-04-05" },
  { id: "DME-002", type: "Road Marking", highway: "DME", chainage: "KM 10+500", lat: 28.720, lng: 77.310, currentRL: 158, ircMin: 120, status: "compliant", lastMeasured: "2026-04-03" },
  { id: "DME-003", type: "Guide Sign", highway: "DME", chainage: "KM 22+800", lat: 28.780, lng: 77.410, currentRL: 116, ircMin: 120, status: "warning", lastMeasured: "2026-04-01" },
  { id: "DME-004", type: "Warning Sign", highway: "DME", chainage: "KM 35+200", lat: 28.830, lng: 77.505, currentRL: 141, ircMin: 120, status: "compliant", lastMeasured: "2026-03-30" },
  { id: "DME-005", type: "Chevron Marker", highway: "DME", chainage: "KM 48+600", lat: 28.880, lng: 77.605, currentRL: 88, ircMin: 120, status: "critical", lastMeasured: "2026-03-28" },
  { id: "DME-006", type: "Delineator Post", highway: "DME", chainage: "KM 55+100", lat: 28.920, lng: 77.680, currentRL: 153, ircMin: 120, status: "compliant", lastMeasured: "2026-03-25" },
  { id: "DME-007", type: "Regulatory Sign", highway: "DME", chainage: "KM 60+400", lat: 28.960, lng: 77.720, currentRL: 139, ircMin: 120, status: "compliant", lastMeasured: "2026-03-22" },

  // Extra assets to get to ~50
  { id: "NH48-010", type: "Delineator Post", highway: "NH-48", chainage: "KM 330+500", lat: 22.700, lng: 72.900, currentRL: 126, ircMin: 120, status: "compliant", lastMeasured: "2026-03-02" },
  { id: "NH44-010", type: "Chevron Marker", highway: "NH-44", chainage: "KM 550+300", lat: 24.500, lng: 80.100, currentRL: 110, ircMin: 120, status: "warning", lastMeasured: "2026-03-08" },
  { id: "NH44-011", type: "Guide Sign", highway: "NH-44", chainage: "KM 1050+800", lat: 19.880, lng: 79.300, currentRL: 136, ircMin: 120, status: "compliant", lastMeasured: "2026-03-05" },
  { id: "NH66-007", type: "Regulatory Sign", highway: "NH-66", chainage: "KM 280+300", lat: 16.300, lng: 73.500, currentRL: 150, ircMin: 120, status: "compliant", lastMeasured: "2026-03-12" },
  { id: "NH27-009", type: "Warning Sign", highway: "NH-27", chainage: "KM 780+600", lat: 26.700, lng: 81.500, currentRL: 92, ircMin: 120, status: "critical", lastMeasured: "2026-03-09" },
  { id: "DME-008", type: "Road Marking", highway: "DME", chainage: "KM 65+200", lat: 28.990, lng: 77.750, currentRL: 160, ircMin: 120, status: "compliant", lastMeasured: "2026-03-20" },
  { id: "NH48-011", type: "Warning Sign", highway: "NH-48", chainage: "KM 350+800", lat: 22.900, lng: 72.750, currentRL: 105, ircMin: 120, status: "warning", lastMeasured: "2026-02-28" },
  { id: "NH44-012", type: "Delineator Post", highway: "NH-44", chainage: "KM 1350+200", lat: 15.200, lng: 78.900, currentRL: 144, ircMin: 120, status: "compliant", lastMeasured: "2026-03-02" },
];

// ------- Assets Table Data -------
export const tableAssets = mapAssets.map((a) => ({
  id: a.id,
  type: a.type,
  highway: a.highway,
  chainage: a.chainage,
  currentRL: a.currentRL,
  ircMin: a.ircMin,
  status: a.status,
  lastMeasured: a.lastMeasured,
}));

// ------- Alerts -------
export const sampleAlerts: AlertData[] = [
  { id: "ALT-001", severity: "critical", message: "Retroreflectivity below 70% of IRC minimum for Warning Sign", highway: "NH-44", chainage: "KM 950+200", timestamp: "2026-04-08 09:15" },
  { id: "ALT-002", severity: "critical", message: "Sign face severely degraded — immediate replacement needed", highway: "NH-66", chainage: "KM 210+500", timestamp: "2026-04-08 08:42" },
  { id: "ALT-003", severity: "critical", message: "Road marking RL dropped below critical threshold", highway: "NH-48", chainage: "KM 120+400", timestamp: "2026-04-07 17:30" },
  { id: "ALT-004", severity: "critical", message: "Chevron marker failed compliance — safety risk at curve", highway: "DME", chainage: "KM 48+600", timestamp: "2026-04-07 14:20" },
  { id: "ALT-005", severity: "critical", message: "Guide sign RL at 101 mcd/lx/m2 — well below IRC minimum", highway: "NH-27", chainage: "KM 170+100", timestamp: "2026-04-07 11:55" },
  { id: "ALT-006", severity: "warning", message: "Guide sign approaching non-compliance threshold", highway: "NH-48", chainage: "KM 45+800", timestamp: "2026-04-07 16:45" },
  { id: "ALT-007", severity: "warning", message: "Regulatory sign RL trending downward — maintenance scheduled", highway: "NH-48", chainage: "KM 210+200", timestamp: "2026-04-07 10:20" },
  { id: "ALT-008", severity: "warning", message: "Warning sign within 5% of IRC minimum threshold", highway: "NH-27", chainage: "KM 290+600", timestamp: "2026-04-06 14:30" },
  { id: "ALT-009", severity: "warning", message: "Chevron marker reflectivity degraded by 12% in 90 days", highway: "NH-66", chainage: "KM 400+700", timestamp: "2026-04-06 09:15" },
  { id: "ALT-010", severity: "warning", message: "Guide sign RL below recommended level — monitor closely", highway: "DME", chainage: "KM 22+800", timestamp: "2026-04-05 16:10" },
  { id: "ALT-011", severity: "warning", message: "Regulatory sign nearing maintenance window", highway: "NH-27", chainage: "KM 720+100", timestamp: "2026-04-05 11:40" },
  { id: "ALT-012", severity: "info", message: "Scheduled measurement due for NH-48 corridor in 7 days", highway: "NH-48", chainage: "Full corridor", timestamp: "2026-04-05 08:00" },
  { id: "ALT-013", severity: "info", message: "New calibration reference values updated for FY 2026-27", highway: "All", chainage: "N/A", timestamp: "2026-04-04 12:00" },
  { id: "ALT-014", severity: "info", message: "DME quarterly compliance report generated successfully", highway: "DME", chainage: "Full corridor", timestamp: "2026-04-03 09:30" },
  { id: "ALT-015", severity: "warning", message: "Chevron marker shows 15% degradation over last quarter", highway: "NH-44", chainage: "KM 550+300", timestamp: "2026-04-03 07:45" },
];

// ------- Chart Data -------
export const complianceByHighway = [
  { highway: "NH-48", compliant: 8, warning: 2, critical: 1 },
  { highway: "NH-44", compliant: 6, warning: 2, critical: 3 },
  { highway: "NH-27", compliant: 5, warning: 2, critical: 2 },
  { highway: "NH-66", compliant: 4, warning: 2, critical: 1 },
  { highway: "DME", compliant: 6, warning: 1, critical: 1 },
];

export const assetTypeDistribution = [
  { name: "Regulatory Signs", value: 42, color: "#3B82F6" },
  { name: "Road Markings", value: 28, color: "#8B5CF6" },
  { name: "Guide Signs", value: 18, color: "#06B6D4" },
  { name: "Warning Signs", value: 22, color: "#F59E0B" },
  { name: "Chevron Markers", value: 15, color: "#10B981" },
  { name: "Delineator Posts", value: 19, color: "#EC4899" },
];

// ------- Reports Data -------
export const highwayReports: Record<
  string,
  {
    totalAssets: number;
    compliantPct: number;
    warningPct: number;
    criticalPct: number;
    breakdown: { type: string; total: number; compliant: number; warning: number; critical: number }[];
    criticalAssets: { id: string; type: string; chainage: string; currentRL: number; ircMin: number }[];
  }
> = {
  "NH-48": {
    totalAssets: 45,
    compliantPct: 73,
    warningPct: 18,
    criticalPct: 9,
    breakdown: [
      { type: "Regulatory Signs", total: 12, compliant: 9, warning: 2, critical: 1 },
      { type: "Road Markings", total: 10, compliant: 8, warning: 1, critical: 1 },
      { type: "Guide Signs", total: 8, compliant: 5, warning: 2, critical: 1 },
      { type: "Warning Signs", total: 6, compliant: 4, warning: 2, critical: 0 },
      { type: "Chevron Markers", total: 5, compliant: 4, warning: 0, critical: 1 },
      { type: "Delineator Posts", total: 4, compliant: 3, warning: 1, critical: 0 },
    ],
    criticalAssets: [
      { id: "NH48-005", type: "Warning Sign", chainage: "KM 120+400", currentRL: 89, ircMin: 120 },
      { id: "NH48-017", type: "Chevron Marker", chainage: "KM 198+200", currentRL: 76, ircMin: 120 },
      { id: "NH48-029", type: "Guide Sign", chainage: "KM 267+100", currentRL: 98, ircMin: 120 },
      { id: "NH48-038", type: "Road Marking", chainage: "KM 312+800", currentRL: 62, ircMin: 100 },
    ],
  },
  "NH-44": {
    totalAssets: 62,
    compliantPct: 68,
    warningPct: 19,
    criticalPct: 13,
    breakdown: [
      { type: "Regulatory Signs", total: 16, compliant: 11, warning: 3, critical: 2 },
      { type: "Road Markings", total: 14, compliant: 10, warning: 2, critical: 2 },
      { type: "Guide Signs", total: 10, compliant: 6, warning: 2, critical: 2 },
      { type: "Warning Signs", total: 9, compliant: 6, warning: 2, critical: 1 },
      { type: "Chevron Markers", total: 7, compliant: 5, warning: 1, critical: 1 },
      { type: "Delineator Posts", total: 6, compliant: 4, warning: 2, critical: 0 },
    ],
    criticalAssets: [
      { id: "NH44-002", type: "Regulatory Sign", chainage: "KM 80+200", currentRL: 95, ircMin: 120 },
      { id: "NH44-007", type: "Warning Sign", chainage: "KM 950+200", currentRL: 78, ircMin: 120 },
      { id: "NH44-019", type: "Road Marking", chainage: "KM 420+500", currentRL: 55, ircMin: 100 },
      { id: "NH44-033", type: "Guide Sign", chainage: "KM 780+100", currentRL: 84, ircMin: 120 },
      { id: "NH44-045", type: "Regulatory Sign", chainage: "KM 1100+300", currentRL: 91, ircMin: 120 },
    ],
  },
  "NH-27": {
    totalAssets: 38,
    compliantPct: 71,
    warningPct: 16,
    criticalPct: 13,
    breakdown: [
      { type: "Regulatory Signs", total: 10, compliant: 7, warning: 2, critical: 1 },
      { type: "Road Markings", total: 8, compliant: 6, warning: 1, critical: 1 },
      { type: "Guide Signs", total: 6, compliant: 4, warning: 1, critical: 1 },
      { type: "Warning Signs", total: 6, compliant: 4, warning: 1, critical: 1 },
      { type: "Chevron Markers", total: 4, compliant: 3, warning: 0, critical: 1 },
      { type: "Delineator Posts", total: 4, compliant: 3, warning: 1, critical: 0 },
    ],
    criticalAssets: [
      { id: "NH27-003", type: "Guide Sign", chainage: "KM 170+100", currentRL: 101, ircMin: 120 },
      { id: "NH27-009", type: "Warning Sign", chainage: "KM 780+600", currentRL: 92, ircMin: 120 },
      { id: "NH27-022", type: "Road Marking", chainage: "KM 450+200", currentRL: 68, ircMin: 100 },
    ],
  },
  "NH-66": {
    totalAssets: 28,
    compliantPct: 75,
    warningPct: 14,
    criticalPct: 11,
    breakdown: [
      { type: "Regulatory Signs", total: 7, compliant: 5, warning: 1, critical: 1 },
      { type: "Road Markings", total: 6, compliant: 5, warning: 1, critical: 0 },
      { type: "Guide Signs", total: 5, compliant: 4, warning: 1, critical: 0 },
      { type: "Warning Signs", total: 4, compliant: 3, warning: 0, critical: 1 },
      { type: "Chevron Markers", total: 3, compliant: 2, warning: 0, critical: 1 },
      { type: "Delineator Posts", total: 3, compliant: 2, warning: 1, critical: 0 },
    ],
    criticalAssets: [
      { id: "NH66-004", type: "Warning Sign", chainage: "KM 210+500", currentRL: 82, ircMin: 120 },
      { id: "NH66-018", type: "Chevron Marker", chainage: "KM 320+400", currentRL: 74, ircMin: 120 },
    ],
  },
  DME: {
    totalAssets: 32,
    compliantPct: 78,
    warningPct: 13,
    criticalPct: 9,
    breakdown: [
      { type: "Regulatory Signs", total: 8, compliant: 7, warning: 1, critical: 0 },
      { type: "Road Markings", total: 7, compliant: 6, warning: 0, critical: 1 },
      { type: "Guide Signs", total: 5, compliant: 4, warning: 1, critical: 0 },
      { type: "Warning Signs", total: 5, compliant: 3, warning: 1, critical: 1 },
      { type: "Chevron Markers", total: 4, compliant: 3, warning: 0, critical: 1 },
      { type: "Delineator Posts", total: 3, compliant: 2, warning: 1, critical: 0 },
    ],
    criticalAssets: [
      { id: "DME-005", type: "Chevron Marker", chainage: "KM 48+600", currentRL: 88, ircMin: 120 },
      { id: "DME-014", type: "Warning Sign", chainage: "KM 42+100", currentRL: 96, ircMin: 120 },
    ],
  },
};
