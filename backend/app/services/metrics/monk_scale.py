import math

MONK_CENTROIDS_CIELAB: dict[int, tuple[float, float, float]] = {
    1: (85.3, 3.8, 12.5),
    2: (78.0, 5.2, 17.1),
    3: (71.5, 7.1, 20.3),
    4: (64.8, 9.4, 23.0),
    5: (58.2, 11.2, 24.5),
    6: (51.3, 12.8, 25.1),
    7: (44.1, 14.0, 24.4),
    8: (36.8, 14.5, 22.0),
    9: (29.5, 13.8, 18.2),
    10: (21.4, 11.2, 13.0),
}

# Hex representations for UI rendering
MONK_HEX_CODES: dict[int, str] = {
    1: "#f6ede4",
    2: "#f3e7db",
    3: "#f7dad0",
    4: "#eadaba",
    5: "#d7bd96",
    6: "#a07e56",
    7: "#825c43",
    8: "#604134",
    9: "#3a312a",
    10: "#292420",
}


def find_closest_monk_tone(l_star: float, a_star: float, b_star: float) -> tuple[int, float]:
    """Finds closest Monk Skin Tone (1-10) using Euclidean Delta E in CIELab space."""
    best_tone = 1
    min_delta_e = float("inf")

    for tone, (ref_l, ref_a, ref_b) in MONK_CENTROIDS_CIELAB.items():
        delta_l = l_star - ref_l
        delta_a = a_star - ref_a
        delta_b = b_star - ref_b
        delta_e = math.sqrt(delta_l**2 + delta_a**2 + delta_b**2)

        if delta_e < min_delta_e:
            min_delta_e = delta_e
            best_tone = tone

    return best_tone, round(min_delta_e, 2)
