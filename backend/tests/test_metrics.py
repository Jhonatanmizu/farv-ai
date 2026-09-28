import pytest

from app.services.metrics.ita_calculator import calculate_ita
from app.services.metrics.monk_scale import MONK_CENTROIDS_CIELAB, find_closest_monk_tone


def test_ita_very_light() -> None:
    # High luminance L*=75, low b*=10 -> ITA = arctan(25/10) * 180 / pi = 68.2 degrees
    ita, category = calculate_ita(l_star=75.0, b_star=10.0)
    assert ita > 55.0
    assert category == "Muito Clara"


def test_ita_dark_and_very_dark() -> None:
    # Low luminance L*=25, high b*=15 -> ITA = arctan(-25/15) * 180 / pi = -59.0 degrees
    ita, category = calculate_ita(l_star=25.0, b_star=15.0)
    assert ita <= -30.0
    assert category == "Muito Escura"


def test_ita_zero_b_boundary() -> None:
    ita_high, _ = calculate_ita(l_star=60.0, b_star=0.0)
    ita_low, _ = calculate_ita(l_star=40.0, b_star=0.0)
    assert ita_high == 90.0
    assert ita_low == -90.0


@pytest.mark.parametrize("tone_id", list(range(1, 11)))
def test_monk_exact_centroids_match(tone_id: int) -> None:
    ref_l, ref_a, ref_b = MONK_CENTROIDS_CIELAB[tone_id]
    closest_tone, delta_e = find_closest_monk_tone(ref_l, ref_a, ref_b)
    assert closest_tone == tone_id
    assert delta_e == 0.0
