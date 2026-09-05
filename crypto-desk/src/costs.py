"""Execution cost models.

The plan this project was commissioned to evaluate proposed trading on a Base L2
"because fees are cheap". Gas is cheap on an L2; gas is not the cost. The cost is
the AMM fee plus price impact plus adverse selection, and it is an order of
magnitude larger than a CEX maker fee. This module exists so that claim can never
be made again without a number attached.
"""
from __future__ import annotations

from dataclasses import dataclass

BPS = 1e-4


@dataclass(frozen=True)
class Venue:
    """Per-side execution costs, plus per-day carry."""

    name: str
    fee_bps: float          # exchange or AMM fee, per side
    spread_bps: float       # half-spread paid crossing, per side
    impact_bps: float       # expected price impact at our size, per side
    gas_usd: float = 0.0    # fixed on-chain cost per side
    funding_bps_day: float = 0.0  # perp funding paid per day of exposure
    can_short: bool = True
    min_notional_usd: float = 0.0

    @property
    def cost_bps_per_side(self) -> float:
        return self.fee_bps + self.spread_bps + self.impact_bps

    def cost_fraction_per_side(self, notional_usd: float) -> float:
        """Total per-side cost as a fraction of notional, including fixed gas.

        Fixed gas is why small accounts are structurally disadvantaged: $0.05 of
        gas is 1.25bps on $400 and 0.05bps on $10,000.
        """
        variable = self.cost_bps_per_side * BPS
        fixed = (self.gas_usd / notional_usd) if notional_usd > 0 else 0.0
        return variable + fixed

    def round_trip_fraction(self, notional_usd: float) -> float:
        return 2.0 * self.cost_fraction_per_side(notional_usd)

    def breakeven_accuracy(self, mean_abs_return: float, notional_usd: float) -> float:
        """Directional accuracy needed just to break even, flipping every bar.

        Edge per bar = (2*acc - 1) * E|r| - round_trip_cost, set to zero.
        Assumes accuracy is independent of move size -- an assumption that is
        usually false and usually false in the unprofitable direction.
        """
        c = self.round_trip_fraction(notional_usd)
        return 0.5 + c / (2.0 * mean_abs_return)


# Costs reflect published retail fee schedules and typical realised slippage at
# small size. They are deliberately pessimistic: a backtest that only works under
# optimistic costs is not a strategy, it is a wish.
VENUES: dict[str, Venue] = {
    # funding_bps_day on the shortable spot venues represents margin borrow at
    # roughly 7% APR. Leaving it at zero silently subsidised every short-capable
    # variant in the selection contest.
    "cex_maker": Venue("CEX spot, maker", fee_bps=10, spread_bps=0, impact_bps=1,
                       funding_bps_day=0.02, min_notional_usd=10.0),
    "cex_taker": Venue("CEX spot, taker", fee_bps=20, spread_bps=1, impact_bps=2,
                       funding_bps_day=0.02, min_notional_usd=10.0),
    "cex_spot_long_only": Venue(
        "CEX spot, taker, long-only", fee_bps=20, spread_bps=1, impact_bps=2,
        can_short=False, min_notional_usd=10.0,
    ),
    "perp_dex": Venue(
        "Perp DEX", fee_bps=4.5, spread_bps=1, impact_bps=2,
        funding_bps_day=1.0, min_notional_usd=10.0,
    ),
    "base_amm_tight": Venue(
        "Base L2 AMM, 5bp pool (optimistic)", fee_bps=5, spread_bps=0, impact_bps=5,
        gas_usd=0.03, can_short=False,
    ),
    "base_amm_realistic": Venue(
        "Base L2 AMM, 30bp pool (realistic)", fee_bps=30, spread_bps=0, impact_bps=10,
        gas_usd=0.05, can_short=False,
    ),
}

DEFAULT_VENUE = "cex_taker"
