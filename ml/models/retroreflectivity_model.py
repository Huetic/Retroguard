"""
RetroGuard Core Retroreflectivity Estimation Model
===================================================

Provides the RetroReflectivityEstimator class for estimating retroreflectivity
coefficient (RL, in mcd/lx/m^2) from image data.

Supports multiple input modes:
  - Smartphone image (single shot with flash)
  - CCTV footage (headlight illumination events)
  - Dashcam video (continuous capture)

The estimation pipeline:
  1. Extract brightness from a region of interest (ROI)
  2. Apply calibration factor (from reference patch with known RL)
  3. Apply geometric corrections (distance, observation/entrance angles)
  4. Convert corrected brightness to RL value

IRC 67 / IRC 35 minimum thresholds are built in for compliance checking.

Author: RetroGuard Team — NHAI Hackathon 2026
"""

import math
import numpy as np
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# IRC minimum RL values (mcd/lx/m^2)
# Source: IRC 67-2012 (signs) and IRC 35 (markings)
# Keys: (asset_type, material_grade, color)
# ---------------------------------------------------------------------------
IRC_MINIMUMS: Dict[Tuple[str, str, str], float] = {
    # Signs — Engineering Grade (Type I)
    ("sign", "engineering", "white"):   50.0,
    ("sign", "engineering", "yellow"):  25.0,
    ("sign", "engineering", "red"):     14.5,
    ("sign", "engineering", "green"):   9.0,
    ("sign", "engineering", "blue"):    4.0,
    ("sign", "engineering", "orange"):  25.0,
    # Signs — High Intensity (Type III)
    ("sign", "high_intensity", "white"):  250.0,
    ("sign", "high_intensity", "yellow"): 170.0,
    ("sign", "high_intensity", "red"):     45.0,
    ("sign", "high_intensity", "green"):   45.0,
    ("sign", "high_intensity", "blue"):    20.0,
    ("sign", "high_intensity", "orange"): 100.0,
    # Signs — Diamond Grade (Type XI)
    ("sign", "diamond", "white"):  700.0,
    ("sign", "diamond", "yellow"): 480.0,
    ("sign", "diamond", "red"):    120.0,
    ("sign", "diamond", "green"):  100.0,
    ("sign", "diamond", "blue"):    50.0,
    ("sign", "diamond", "orange"): 350.0,
    # Pavement markings
    ("marking", "standard", "white"):  100.0,
    ("marking", "standard", "yellow"):  80.0,
    ("marking", "high_performance", "white"):  200.0,
    ("marking", "high_performance", "yellow"): 150.0,
    # Raised Pavement Markers
    ("rpm", "standard", "white"):   100.0,
    ("rpm", "standard", "yellow"):   75.0,
    ("rpm", "standard", "red"):      50.0,
    # Delineators
    ("delineator", "standard", "white"):  200.0,
    ("delineator", "standard", "yellow"): 150.0,
    ("delineator", "standard", "red"):    75.0,
}


class RetroReflectivityEstimator:
    """
    Estimates retroreflectivity coefficient from image data.
    Supports multiple input modes: smartphone, CCTV, dashcam.
    """

    # Default calibration assumes a reference white sign at known RL
    DEFAULT_CALIBRATION_FACTOR = 2.5     # RL per unit brightness
    DEFAULT_REFERENCE_RL = 250.0         # mcd/lx/m^2 for typical HI white

    def __init__(
        self,
        calibration_factor: Optional[float] = None,
        reference_rl: Optional[float] = None,
    ):
        """
        Parameters
        ----------
        calibration_factor : float, optional
            Pre-computed calibration factor (RL per unit brightness).
            If None, the default value is used until ``calibrate()`` is called.
        reference_rl : float, optional
            Known RL of the reference patch used during calibration.
        """
        self.calibration_factor = (
            calibration_factor
            if calibration_factor is not None
            else self.DEFAULT_CALIBRATION_FACTOR
        )
        self.reference_rl = (
            reference_rl
            if reference_rl is not None
            else self.DEFAULT_REFERENCE_RL
        )
        self.is_calibrated = calibration_factor is not None

    # ------------------------------------------------------------------
    # Calibration
    # ------------------------------------------------------------------

    def calibrate(self, reference_image: np.ndarray, known_rl: float) -> float:
        """
        Calibrate the estimator using a reference patch with known RL.

        The calibration factor is computed as:
            calibration_factor = known_rl / mean_brightness(reference_image)

        Parameters
        ----------
        reference_image : np.ndarray
            Image (BGR or grayscale) of a reference retroreflective patch.
        known_rl : float
            Known retroreflectivity of the reference patch (mcd/lx/m^2).

        Returns
        -------
        float
            The computed calibration factor.
        """
        brightness = self._extract_brightness(reference_image)
        if brightness < 1.0:
            brightness = 1.0  # avoid division by zero
        self.calibration_factor = known_rl / brightness
        self.reference_rl = known_rl
        self.is_calibrated = True
        return self.calibration_factor

    # ------------------------------------------------------------------
    # Brightness extraction
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_brightness(image: np.ndarray, roi: Optional[Tuple[int, int, int, int]] = None) -> float:
        """
        Extract mean luminance from an image or ROI.

        Parameters
        ----------
        image : np.ndarray
            Input image (BGR or grayscale).
        roi : tuple (x, y, w, h), optional
            Region of interest. If None, the whole image is used.

        Returns
        -------
        float
            Mean luminance (0-255 scale).
        """
        if roi is not None:
            x, y, w, h = roi
            patch = image[y:y + h, x:x + w]
        else:
            patch = image

        if patch.size == 0:
            return 0.0

        # Convert to grayscale luminance if color
        if len(patch.shape) == 3 and patch.shape[2] == 3:
            # BT.601 luminance weights (BGR order for OpenCV)
            luminance = (
                0.114 * patch[:, :, 0].astype(np.float64)
                + 0.587 * patch[:, :, 1].astype(np.float64)
                + 0.299 * patch[:, :, 2].astype(np.float64)
            )
            return float(np.mean(luminance))
        else:
            return float(np.mean(patch.astype(np.float64)))

    # ------------------------------------------------------------------
    # Geometric correction
    # ------------------------------------------------------------------

    @staticmethod
    def _geometric_correction(distance: float, angle: float) -> float:
        """
        Compute geometric correction factor for observation geometry.

        The retroreflectivity measurement depends on:
          - Distance from light source to sign (inverse square law component)
          - Observation angle (cosine correction)

        The correction normalises to a reference geometry of 30 m distance
        and 0.2 deg observation angle (standard retroreflectometer setup).

        Parameters
        ----------
        distance : float
            Estimated distance from camera/light to sign (metres).
        angle : float
            Observation angle in degrees.

        Returns
        -------
        float
            Multiplicative correction factor (>1 means raw value is
            underestimated and needs boosting).
        """
        ref_distance = 30.0   # metres — standard measurement distance
        ref_angle = 0.2       # degrees — standard observation angle

        # Distance correction (inverse-square-ish, softened for real optics)
        distance = max(distance, 1.0)
        dist_factor = (distance / ref_distance) ** 1.5

        # Angle correction (cosine fall-off)
        angle_rad = math.radians(max(angle, 0.01))
        ref_angle_rad = math.radians(ref_angle)
        angle_factor = math.cos(ref_angle_rad) / max(math.cos(angle_rad), 0.01)

        return dist_factor * angle_factor

    # ------------------------------------------------------------------
    # RL estimation — single image
    # ------------------------------------------------------------------

    def estimate_from_image(
        self,
        image: np.ndarray,
        roi: Optional[Tuple[int, int, int, int]] = None,
        distance: Optional[float] = None,
        angle: Optional[float] = None,
    ) -> Dict:
        """
        Estimate RL from a single image.

        Parameters
        ----------
        image : np.ndarray
            Input image (BGR or grayscale).
        roi : tuple (x, y, w, h), optional
            Region of interest containing the retroreflective surface.
        distance : float, optional
            Estimated distance to the sign (metres). Default 30 m.
        angle : float, optional
            Observation angle in degrees. Default 0.2 deg.

        Returns
        -------
        dict
            Keys: rl_value, brightness, calibration_factor,
                  geometric_correction, confidence, is_calibrated
        """
        if distance is None:
            distance = 30.0
        if angle is None:
            angle = 0.2

        brightness = self._extract_brightness(image, roi)
        geo_corr = self._geometric_correction(distance, angle)
        rl_value = brightness * self.calibration_factor * geo_corr

        # Confidence estimate (heuristic: higher brightness -> higher confidence)
        # and penalise extreme geometry
        brightness_conf = min(brightness / 128.0, 1.0)
        geo_conf = 1.0 / (1.0 + 0.1 * abs(distance - 30.0) + 0.5 * abs(angle - 0.2))
        confidence = round(0.6 * brightness_conf + 0.4 * geo_conf, 3)

        return {
            "rl_value": round(rl_value, 2),
            "brightness": round(brightness, 2),
            "calibration_factor": round(self.calibration_factor, 4),
            "geometric_correction": round(geo_corr, 4),
            "confidence": confidence,
            "is_calibrated": self.is_calibrated,
        }

    # ------------------------------------------------------------------
    # RL estimation — video frames (CCTV / dashcam)
    # ------------------------------------------------------------------

    def estimate_from_video_frames(
        self,
        frames: List[np.ndarray],
        sign_roi: Tuple[int, int, int, int],
        distances: Optional[List[float]] = None,
        angles: Optional[List[float]] = None,
    ) -> Dict:
        """
        Estimate RL from multiple video frames (CCTV / dashcam mode).

        Uses the median of per-frame estimates for robustness against
        outliers (e.g. partial occlusion, headlight glare).

        Parameters
        ----------
        frames : list of np.ndarray
            List of video frames.
        sign_roi : tuple (x, y, w, h)
            Fixed ROI of the sign across frames.
        distances : list of float, optional
            Per-frame distances. If None, 30 m is assumed for all.
        angles : list of float, optional
            Per-frame observation angles. If None, 0.2 deg for all.

        Returns
        -------
        dict
            Keys: rl_value (median), rl_std, n_frames, per_frame_values,
                  confidence, is_calibrated
        """
        n = len(frames)
        if distances is None:
            distances = [30.0] * n
        if angles is None:
            angles = [0.2] * n

        per_frame: List[float] = []
        for i, frame in enumerate(frames):
            result = self.estimate_from_image(
                frame, roi=sign_roi, distance=distances[i], angle=angles[i]
            )
            per_frame.append(result["rl_value"])

        if not per_frame:
            return {
                "rl_value": 0.0,
                "rl_std": 0.0,
                "n_frames": 0,
                "per_frame_values": [],
                "confidence": 0.0,
                "is_calibrated": self.is_calibrated,
            }

        median_rl = float(np.median(per_frame))
        std_rl = float(np.std(per_frame))

        # Confidence: more frames and lower variance -> higher confidence
        frame_conf = min(n / 10.0, 1.0)
        var_conf = 1.0 / (1.0 + std_rl / max(median_rl, 1.0))
        confidence = round(0.5 * frame_conf + 0.5 * var_conf, 3)

        return {
            "rl_value": round(median_rl, 2),
            "rl_std": round(std_rl, 2),
            "n_frames": n,
            "per_frame_values": [round(v, 2) for v in per_frame],
            "confidence": confidence,
            "is_calibrated": self.is_calibrated,
        }

    # ------------------------------------------------------------------
    # IRC threshold look-up
    # ------------------------------------------------------------------

    @staticmethod
    def get_irc_minimum(
        asset_type: str, material_grade: str, color: str
    ) -> float:
        """
        Look up IRC 67/35 minimum RL for given asset parameters.

        Parameters
        ----------
        asset_type : str
            One of: sign, marking, rpm, delineator
        material_grade : str
            Grade of the material (e.g. engineering, high_intensity, diamond,
            standard, high_performance).
        color : str
            Color of the retroreflective surface.

        Returns
        -------
        float
            Minimum RL (mcd/lx/m^2). Returns 50.0 as a safe default
            if the combination is not found.
        """
        key = (asset_type.lower(), material_grade.lower(), color.lower())
        return IRC_MINIMUMS.get(key, 50.0)

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    @staticmethod
    def classify(rl_value: float, irc_minimum: float) -> Dict:
        """
        Classify the retroreflectivity level as compliant, warning, or critical.

        Thresholds:
          - Compliant : RL >= IRC minimum
          - Warning   : 0.5 * IRC minimum <= RL < IRC minimum
          - Critical  : RL < 0.5 * IRC minimum

        Parameters
        ----------
        rl_value : float
            Measured / estimated RL value.
        irc_minimum : float
            Applicable IRC minimum threshold.

        Returns
        -------
        dict
            Keys: status, rl_value, irc_minimum, ratio, recommendation
        """
        ratio = rl_value / max(irc_minimum, 0.01)

        if ratio >= 1.0:
            status = "compliant"
            recommendation = "No action required. Next scheduled inspection."
        elif ratio >= 0.5:
            status = "warning"
            recommendation = (
                "Schedule replacement within 90 days. "
                "RL is below IRC minimum but still partially effective."
            )
        else:
            status = "critical"
            recommendation = (
                "Immediate replacement required. "
                "Retroreflectivity is severely degraded — safety hazard."
            )

        return {
            "status": status,
            "rl_value": round(rl_value, 2),
            "irc_minimum": irc_minimum,
            "ratio": round(ratio, 3),
            "recommendation": recommendation,
        }


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("RetroReflectivityEstimator — self-test")
    print("=" * 50)

    estimator = RetroReflectivityEstimator()

    # Simulate a bright white sign image (200x200 grayscale, mean ~180)
    fake_image = np.random.randint(160, 200, size=(200, 200), dtype=np.uint8)
    result = estimator.estimate_from_image(fake_image, distance=30.0, angle=0.2)
    print(f"Single image estimate: RL = {result['rl_value']:.1f} mcd/lx/m^2")
    print(f"  Brightness: {result['brightness']:.1f}, Confidence: {result['confidence']:.3f}")

    # Classify
    irc_min = estimator.get_irc_minimum("sign", "high_intensity", "white")
    classification = estimator.classify(result["rl_value"], irc_min)
    print(f"  IRC minimum (HI white sign): {irc_min}")
    print(f"  Status: {classification['status']} (ratio={classification['ratio']:.2f})")
    print(f"  Recommendation: {classification['recommendation']}")

    # Multi-frame test
    frames = [np.random.randint(150, 210, size=(200, 200), dtype=np.uint8) for _ in range(8)]
    multi = estimator.estimate_from_video_frames(frames, sign_roi=(20, 20, 160, 160))
    print(f"\nMulti-frame estimate ({multi['n_frames']} frames):")
    print(f"  RL = {multi['rl_value']:.1f} +/- {multi['rl_std']:.1f} mcd/lx/m^2")
    print(f"  Confidence: {multi['confidence']:.3f}")

    print("\nSelf-test complete.")
