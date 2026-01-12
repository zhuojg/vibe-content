---
name: product-research
description: Research consumer products including foods, drinks, and daily life items. Provides market analysis, pricing, and competitor information.
---

# Product Research

## Purpose
Research and analyze consumer products such as foods, drinks, and everyday items. Provides comprehensive market information to support decision-making.

## Use Cases
- Market analysis for new product launches
- Competitor pricing research
- Consumer trend analysis
- Product positioning research

## Parameters

**Required:**
- `productName`: Name of the product to research (e.g., "organic oat milk", "energy drink")
- `category`: Product category (e.g., "beverages", "snacks", "dairy", "household")

**Optional:**
- `market`: Target market region (default: "global")
- `analysisType`: Type of analysis - "pricing", "competitors", "trends", or "comprehensive" (default: "comprehensive")

## Execution

Use the `skill-runner` tool:
```json
{
  "skillName": "product-research",
  "params": {
    "productName": "organic oat milk",
    "category": "beverages",
    "market": "US",
    "analysisType": "comprehensive"
  }
}
```

### Pricing Analysis Example
```json
{
  "skillName": "product-research",
  "params": {
    "productName": "sparkling water",
    "category": "beverages",
    "analysisType": "pricing"
  }
}
```

### Competitor Analysis Example
```json
{
  "skillName": "product-research",
  "params": {
    "productName": "protein bar",
    "category": "snacks",
    "analysisType": "competitors"
  }
}
```

## Output
Returns structured research data including:
- Product overview and market positioning
- Key competitors and market share
- Pricing information and trends
- Consumer insights and preferences
- Recommendations based on analysis type
