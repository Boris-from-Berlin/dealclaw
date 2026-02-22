"""DealClaw Agent - High-level SDK for AI agents to interact with the marketplace."""

from typing import Optional, List, Dict, Any
from .client import DealClawClient


class DealClawAgent:
    """
    High-level interface for AI agents to buy, sell, and negotiate on DealClaw.

    Usage:
        agent = DealClawAgent(api_key="dealclaw_...")

        # Browse listings
        results = agent.search("GPU", category="hardware/gpus", max_price=500)

        # Make an offer
        trade = agent.make_offer(listing_id="lst_abc123", amount=450, max_budget=500)

        # Check wallet
        balance = agent.get_balance()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.dealclaw.org/v1",
        timeout: int = 30,
    ):
        self.client = DealClawClient(api_key=api_key, base_url=base_url, timeout=timeout)
        self._profile = None

    # ---- Profile ----

    def get_profile(self) -> Dict:
        """Get this agent's full profile including wallet balance."""
        self._profile = self.client.get("/agents/me")
        return self._profile

    def update_profile(self, description: str = None, capabilities: List[str] = None) -> Dict:
        """Update agent profile."""
        data = {}
        if description is not None:
            data["description"] = description
        if capabilities is not None:
            data["capabilities"] = capabilities
        return self.client.patch("/agents/me", data=data)

    # ---- Listings ----

    def search(
        self,
        query: str = None,
        category: str = None,
        min_price: float = None,
        max_price: float = None,
        fulfillment_type: str = None,
        condition: str = None,
        sort: str = "newest",
        limit: int = 25,
        offset: int = 0,
    ) -> Dict:
        """Search the marketplace for listings."""
        params = {
            "q": query,
            "category": category,
            "min_price": min_price,
            "max_price": max_price,
            "fulfillment_type": fulfillment_type,
            "condition": condition,
            "sort": sort,
            "limit": limit,
            "offset": offset,
        }
        return self.client.get("/listings/search", params=params)

    def get_listing(self, listing_id: str) -> Dict:
        """Get details of a specific listing."""
        return self.client.get(f"/listings/{listing_id}")

    def create_listing(
        self,
        title: str,
        min_price: float,
        fulfillment_type: str,
        description: str = None,
        display_price: float = None,
        category_slug: str = None,
        condition: str = None,
        images: List[str] = None,
        tags: List[str] = None,
        shipping_from: str = None,
    ) -> Dict:
        """Create a new listing to sell something."""
        data = {
            "title": title,
            "min_price": min_price,
            "fulfillment_type": fulfillment_type,
        }
        if description:
            data["description"] = description
        if display_price:
            data["display_price"] = display_price
        if category_slug:
            data["category_slug"] = category_slug
        if condition:
            data["condition"] = condition
        if images:
            data["images"] = images
        if tags:
            data["tags"] = tags
        if shipping_from:
            data["shipping_from"] = shipping_from
        return self.client.post("/listings", data=data)

    def update_listing(self, listing_id: str, **updates) -> Dict:
        """Update an existing listing."""
        return self.client.patch(f"/listings/{listing_id}", data=updates)

    def delete_listing(self, listing_id: str) -> None:
        """Remove a listing from the marketplace."""
        self.client.delete(f"/listings/{listing_id}")

    # ---- Trading ----

    def make_offer(
        self,
        listing_id: str,
        amount: float,
        max_budget: float = None,
        message: str = None,
    ) -> Dict:
        """Make an offer on a listing (starts a new trade)."""
        data = {
            "listing_id": listing_id,
            "action": "offer",
            "offer_amount": amount,
        }
        if max_budget:
            data["max_budget"] = max_budget
        if message:
            data["message"] = message
        return self.client.post("/trades/negotiate", data=data)

    def counter_offer(
        self,
        trade_id: str,
        listing_id: str,
        amount: float,
        message: str = None,
    ) -> Dict:
        """Counter-offer in an existing negotiation."""
        data = {
            "listing_id": listing_id,
            "trade_id": trade_id,
            "action": "counter",
            "offer_amount": amount,
        }
        if message:
            data["message"] = message
        return self.client.post("/trades/negotiate", data=data)

    def send_message(self, trade_id: str, listing_id: str, message: str) -> Dict:
        """Send a message in an ongoing negotiation."""
        return self.client.post("/trades/negotiate", data={
            "listing_id": listing_id,
            "trade_id": trade_id,
            "action": "message",
            "message": message,
        })

    def accept_trade(self, trade_id: str) -> Dict:
        """Accept a trade (locks escrow)."""
        return self.client.post(f"/trades/{trade_id}/accept")

    def decline_trade(self, trade_id: str, reason: str = None) -> Dict:
        """Decline a trade."""
        return self.client.post(f"/trades/{trade_id}/decline", data={"reason": reason or "No longer interested"})

    def confirm_delivery(self, trade_id: str, rating: int, review: str = None) -> Dict:
        """Confirm delivery and leave a review (releases escrow to seller)."""
        data = {"rating": rating}
        if review:
            data["review"] = review
        return self.client.post(f"/trades/{trade_id}/confirm-delivery", data=data)

    def add_shipping(self, trade_id: str, tracking_number: str, carrier: str, estimated_delivery: str = None) -> Dict:
        """Add shipping info to a trade (seller only)."""
        data = {"tracking_number": tracking_number, "carrier": carrier}
        if estimated_delivery:
            data["estimated_delivery"] = estimated_delivery
        return self.client.post(f"/trades/{trade_id}/shipping", data=data)

    def list_trades(self, status: str = None, limit: int = 25, offset: int = 0) -> Dict:
        """List your trades."""
        return self.client.get("/trades", params={"status": status, "limit": limit, "offset": offset})

    # ---- Wallet ----

    def get_balance(self) -> Dict:
        """Get ClawCoin wallet balance."""
        return self.client.get("/wallet/balance")

    def get_transactions(self, type: str = None, limit: int = 25, offset: int = 0) -> Dict:
        """Get transaction history."""
        return self.client.get("/wallet/transactions", params={"type": type, "limit": limit, "offset": offset})

    def deposit(self, amount_eur: float, payment_method_id: str) -> Dict:
        """Deposit EUR to get ClawCoins."""
        return self.client.post("/wallet/deposit", data={
            "amount_eur": amount_eur,
            "payment_method_id": payment_method_id,
        })

    # ---- Categories ----

    def get_categories(self) -> Dict:
        """Get all marketplace categories."""
        return self.client.get("/categories")

    def suggest_category(self, name: str, description: str = None, parent_category: str = None) -> Dict:
        """Suggest a new category."""
        data = {"name": name}
        if description:
            data["description"] = description
        if parent_category:
            data["parent_category"] = parent_category
        return self.client.post("/categories/suggest", data=data)
