import math


def calculate_ita(l_star: float, b_star: float) -> tuple[float, str]:
    """Calculates Individual Typology Angle (ITA) and Chardon/Fitzpatrick skin tone category."""
    if abs(b_star) < 1e-6:
        ita = 90.0 if l_star >= 50.0 else -90.0
    else:
        ita = math.atan2(l_star - 50.0, b_star) * (180.0 / math.pi)

    if ita > 55.0:
        category = "Muito Clara"
    elif ita > 41.0:
        category = "Clara"
    elif ita > 28.0:
        category = "Intermediária"
    elif ita > 10.0:
        category = "Bronzeada"
    elif ita > -30.0:
        category = "Escura"
    else:
        category = "Muito Escura"

    return round(ita, 2), category
