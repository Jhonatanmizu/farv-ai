import io
from pathlib import Path

import numpy as np
from PIL import Image

from app.services.metrics.ita_calculator import calculate_ita
from app.services.metrics.monk_scale import find_closest_monk_tone


def _srgb_to_linear(channel: np.ndarray) -> np.ndarray:
    channel = channel / 255.0
    return np.where(channel > 0.04045, ((channel + 0.055) / 1.055) ** 2.4, channel / 12.92)


def _linear_to_xyz(rgb_linear: np.ndarray) -> np.ndarray:
    # Standard sRGB D65 transformation matrix
    matrix = np.array(
        [
            [0.4124564, 0.3575761, 0.1804375],
            [0.2126729, 0.7151522, 0.0721750],
            [0.0193339, 0.1191920, 0.9503041],
        ]
    )
    return np.dot(rgb_linear, matrix.T)


def _xyz_to_cielab(xyz: np.ndarray) -> np.ndarray:
    # Reference D65 illuminant
    xn, yn, zn = 0.95047, 1.00000, 1.08883
    x = xyz[..., 0] / xn
    y = xyz[..., 1] / yn
    z = xyz[..., 2] / zn

    epsilon = 0.008856
    kappa = 903.3

    fx = np.where(x > epsilon, np.cbrt(x), (kappa * x + 16.0) / 116.0)
    fy = np.where(y > epsilon, np.cbrt(y), (kappa * y + 16.0) / 116.0)
    fz = np.where(z > epsilon, np.cbrt(z), (kappa * z + 16.0) / 116.0)

    l_star = np.maximum(0.0, 116.0 * fy - 16.0)
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return np.stack([l_star, a_star, b_star], axis=-1)


class SkinColorSampler:
    """Extracts dermic pigmentation and calculates ITA and Monk Skin Tone."""

    def analyze_image(self, image_input: bytes | str | Path) -> dict[str, float | int | str | bool]:
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input)).convert("RGB")
        else:
            image = Image.open(Path(image_input)).convert("RGB")

        width, height = image.size
        # Sample central facial region (30% to 70% width, 25% to 55% height)
        left = int(width * 0.35)
        top = int(height * 0.25)
        right = int(width * 0.65)
        bottom = int(height * 0.55)

        crop_region = image.crop((left, top, right, bottom))
        crop_np = np.array(crop_region, dtype=np.float32)

        # Convert RGB crop to CIELab
        rgb_linear = _srgb_to_linear(crop_np)
        xyz = _linear_to_xyz(rgb_linear)
        lab = _xyz_to_cielab(xyz)

        # Skin filter heuristic: reject extreme highlights/shadows
        l_channel = lab[..., 0]
        a_channel = lab[..., 1]
        b_channel = lab[..., 2]

        valid_mask = (l_channel > 15.0) & (l_channel < 95.0) & (b_channel > 0.0)

        if np.sum(valid_mask) > 100:
            mean_l = float(np.median(l_channel[valid_mask]))
            mean_a = float(np.median(a_channel[valid_mask]))
            mean_b = float(np.median(b_channel[valid_mask]))
            face_detected = True
        else:
            mean_l = float(np.median(l_channel))
            mean_a = float(np.median(a_channel))
            mean_b = float(np.median(b_channel))
            face_detected = False

        ita_angle, ita_category = calculate_ita(mean_l, mean_b)
        monk_tone, monk_delta_e = find_closest_monk_tone(mean_l, mean_a, mean_b)

        return {
            "l_star": round(mean_l, 2),
            "a_star": round(mean_a, 2),
            "b_star": round(mean_b, 2),
            "ita_angle": ita_angle,
            "ita_category": ita_category,
            "monk_tone": monk_tone,
            "monk_delta_e": monk_delta_e,
            "face_detected": face_detected,
        }
