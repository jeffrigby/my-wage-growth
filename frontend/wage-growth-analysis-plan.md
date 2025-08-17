# Wage Growth Analysis Card Implementation Plan

## Overview
A comprehensive analysis card that provides key insights about wage growth over time, comparing nominal vs real (inflation-adjusted) changes.

## Component Design

### Purpose
- Summarize the overall wage growth journey
- Highlight the impact of inflation on purchasing power
- Provide actionable insights beyond raw data
- Answer: "What does my wage history really mean?"

### Key Metrics to Display

1. **Total Growth Comparison**
   - Nominal Growth: `((lastAmount - firstAmount) / firstAmount) * 100`
   - Real Growth: `((lastTodaysValue - firstTodaysValue) / firstTodaysValue) * 100`
   - Visual comparison showing the gap

2. **Compound Annual Growth Rate (CAGR)**
   - Nominal CAGR: `((lastAmount / firstAmount) ^ (1 / years)) - 1`
   - Real CAGR: `((lastTodaysValue / firstTodaysValue) ^ (1 / years)) - 1`

3. **Inflation Impact**
   - Absolute impact: `nominalGrowth - realGrowth`
   - Relative impact: "Inflation eroded X% of your wage gains"
   - Visual indicator (progress bar or chart)

4. **Time Period Summary**
   - Clear date range: "2020 - 2024 (5 years)"
   - Number of entries analyzed

5. **Additional Insights** (if applicable)
   - Best/worst years for real growth
   - Comparison to average inflation rate
   - Cumulative vs average growth

## Visual Design

### Layout Structure
```
┌─────────────────────────────────────────┐
│ 📊 Your Wage Growth Analysis            │
│ ─────────────────────────────────────── │
│                                         │
│  Total Growth (2020-2024)               │
│  ┌─────────────┬─────────────┐         │
│  │ Nominal     │ Real        │         │
│  │ +30.9% 📈   │ +8.0% 📈    │         │
│  └─────────────┴─────────────┘         │
│                                         │
│  💰 Inflation Impact                    │
│  ░░░░░░░░░░░████████ 22.9%            │
│  "Inflation eroded $X of wage gains"   │
│                                         │
│  📅 Annual Averages                     │
│  Nominal: +5.5%/year                    │
│  Real: +1.5%/year                       │
│                                         │
│  [?] What do these numbers mean?        │
└─────────────────────────────────────────┘
```

### Styling Guidelines
- Use glass-morphism to match existing cards
- Color coding:
  - Green for positive growth
  - Red for negative growth
  - Amber/yellow for inflation impact
- Subtle animations on mount
- Hover states for interactive elements
- Tooltips for additional context

## Implementation Details

### Component Structure
```typescript
interface WageGrowthAnalysisProps {
  entries: WageEntry[];
  cpiData: CPIData | null;
  currency: string;
  country: string;
  calculationType: TableSettings['cpiCalculationType'];
}
```

### Calculation Logic
1. Only show when there are 2+ entries
2. Use first and last entries for total calculations
3. Account for gaps in years when calculating CAGR
4. Handle edge cases (negative growth, missing CPI data)

### Interactive Features
- Expandable "What do these numbers mean?" section
- Tooltips explaining each metric
- Click to highlight corresponding years in table
- Share button to export analysis

### Mobile Considerations
- Stack metrics vertically on small screens
- Simplified visualizations
- Maintain readability with larger touch targets

## Integration Points

### Placement
- Below the wage entries table
- Above the footer information
- Visible without scrolling (if possible)

### Data Flow
- Reads from Redux store (entries, CPI data)
- Recalculates on any entry change
- Shows loading state while CPI data fetches

### State Management
- Analysis results could be memoized
- No additional Redux state needed
- Pure calculated values from existing data

## Future Enhancements

1. **Visualizations**
   - Mini line chart showing growth trend
   - Stacked bar showing nominal vs real
   - Inflation impact visualization

2. **Comparisons**
   - Compare to national wage growth averages
   - Industry-specific benchmarks
   - Regional cost of living adjustments

3. **Projections**
   - "At this rate, in 5 years..."
   - Required growth to meet goals
   - Inflation scenarios

4. **Export Options**
   - Download analysis as image
   - Copy insights as text
   - Share via URL

## Technical Considerations

### Performance
- Memoize calculations with `useMemo`
- Debounce updates during rapid changes
- Lazy load visualization components

### Accessibility
- Proper ARIA labels for metrics
- Screen reader friendly descriptions
- Keyboard navigation support
- High contrast mode support

### Testing
- Unit tests for calculation functions
- Edge cases (single entry, same amounts)
- Visual regression tests
- Mobile responsiveness tests

## Example Code Structure

```typescript
// components/calculator/WageGrowthAnalysis.tsx
export const WageGrowthAnalysis: React.FC<WageGrowthAnalysisProps> = ({
  entries,
  cpiData,
  currency,
  country,
  calculationType
}) => {
  const analysis = useMemo(() => 
    calculateWageGrowthAnalysis(entries, cpiData, calculationType),
    [entries, cpiData, calculationType]
  );

  if (!analysis) return null;

  return (
    <motion.div className="glass-card p-6">
      {/* Component implementation */}
    </motion.div>
  );
};

// utils/wageAnalysis.ts
export const calculateWageGrowthAnalysis = (
  entries: WageEntry[],
  cpiData: CPIData | null,
  calculationType: TableSettings['cpiCalculationType']
): WageGrowthAnalysis | null => {
  // Calculation implementation
};
```

## Success Metrics
- Users understand their real wage growth
- Reduced questions about what the numbers mean
- Increased engagement with the tool
- Positive feedback on clarity of insights