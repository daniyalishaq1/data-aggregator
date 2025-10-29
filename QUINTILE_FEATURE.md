# Quintile Color Coding Feature

## Overview

Keywords are now automatically color-coded into **5 quintiles** based on their **Cost Per Acquisition (CPA)** - the ratio of Cost to Conversions. This helps you quickly identify which keywords are performing best and which need optimization.

## Color Scheme (Pastel Gradient)

### Quintile 1 - Pastel Mint/Teal (Best Performance)
- **Color**: #7FC7AF (Pastel Mint/Teal)
- **Meaning**: Lowest CPA - Best performing keywords
- **Action**: Keep investing in these keywords

### Quintile 2 - Pastel Sage (Good Performance)
- **Color**: #C9D9C0 (Pastel Sage)
- **Meaning**: Below average CPA - Good performing keywords
- **Action**: Maintain or increase investment

### Quintile 3 - Pastel Cream (Average Performance)
- **Color**: #FFE5CC (Pastel Cream)
- **Meaning**: Average CPA - Middle-tier keywords
- **Action**: Monitor and optimize

### Quintile 4 - Pastel Peach (Below Average Performance)
- **Color**: #FFCCB3 (Pastel Peach)
- **Meaning**: Above average CPA - Below average keywords
- **Action**: Consider optimizing or reducing investment

### Quintile 5 - Pastel Coral/Red (Worst Performance)
- **Color**: #FF9999 (Pastel Coral/Red)
- **Meaning**: Highest CPA or no conversions - Worst performing keywords
- **Action**: Optimize, pause, or stop investing

## How It Works

### Calculation Method

**Two-Step Process:**

#### Step 1: Separate Keywords by Conversion Status
- **With Conversions**: Keywords that have at least 1 conversion
- **Without Conversions**: Keywords with 0 conversions

#### Step 2: Assign Quintiles

1. **Quintile 5 (Worst)**: ALL keywords with **zero conversions** are automatically assigned here
   - No CPA calculation needed (no conversions = worst performance)

2. **Quintiles 1-4**: Divide keywords WITH conversions into **4 equal groups** (quartiles) based on CPA:
   ```
   CPA = Total Cost / Total Conversions
   ```

   - **Quintile 1** (Best): Bottom 25% - Lowest CPA
   - **Quintile 2** (Good): Next 25% - Below average CPA
   - **Quintile 3** (Average): Next 25% - Above average CPA
   - **Quintile 4** (Below Avg): Top 25% - Highest CPA (among keywords with conversions)

**Key Difference**: Quintile 5 is reserved ONLY for zero-conversion keywords, while the remaining keywords are distributed across Quintiles 1-4 based purely on CPA performance.

### Visual Indicators

- **Row Background**: Entire keyword row is colored
- **Text Color**:
  - White text on dark backgrounds (Quintiles 1 & 5)
  - Dark text on light backgrounds (Quintiles 2, 3, & 4)
- **Expand Icon**: Color-matched to the quintile theme
- **Hover Effect**: Slightly darker shade on hover

## Legend

A legend appears above the results table showing all 5 quintiles with:
- Color sample box
- Performance level label
- Description

## Example Interpretation

### Sample Data

| Keyword | Conversions | Cost | CPA | Quintile | Color |
|---------|-------------|------|-----|----------|-------|
| keyword-a | 100 | $50 | $0.50 | 1 | Pastel Mint/Teal |
| keyword-b | 80 | $60 | $0.75 | 2 | Pastel Sage |
| keyword-c | 50 | $50 | $1.00 | 3 | Pastel Cream |
| keyword-d | 30 | $60 | $2.00 | 4 | Pastel Peach |
| keyword-e | 10 | $50 | $5.00 | 5 | Pastel Coral |
| keyword-f | 0 | $100 | N/A | 5 | Pastel Coral |

### Analysis

- **keyword-a**: Best performer ($0.50 per conversion) → Keep investing
- **keyword-b**: Good performer ($0.75 per conversion) → Maintain
- **keyword-c**: Average performer ($1.00 per conversion) → Monitor
- **keyword-d**: Below average ($2.00 per conversion) → Optimize
- **keyword-e**: Poor performer ($5.00 per conversion) → Consider pausing
- **keyword-f**: No conversions → Stop or heavily optimize

## Benefits

### 1. Quick Visual Analysis
- Instantly identify top and bottom performers
- No need to calculate CPA manually
- Color-coded for easy scanning

### 2. Data-Driven Decisions
- Prioritize optimization efforts
- Allocate budget more effectively
- Identify keywords to pause or stop

### 3. Performance Tracking
- Compare keywords at a glance
- Identify trends across properties
- Monitor improvement over time

### 4. Strategic Planning
- Focus on scaling best performers
- Optimize middle-tier keywords
- Cut underperforming keywords

## Use Cases

### Budget Allocation
- Increase spend on Quintile 1 & 2 keywords
- Maintain spend on Quintile 3 keywords
- Reduce spend on Quintile 4 & 5 keywords

### Optimization Priority
1. **First**: Fix Quintile 5 keywords (highest impact potential)
2. **Second**: Improve Quintile 4 keywords
3. **Third**: Optimize Quintile 3 keywords
4. **Monitor**: Quintile 1 & 2 keywords for any degradation

### Reporting
- Easy to present to stakeholders
- Clear visual hierarchy
- Actionable insights at a glance

## Technical Details

### Files Modified

1. **[app.js](app.js)**
   - Added `calculateQuintiles()` function
   - Added `getQuintileClass()` function
   - Modified `displayResults()` to apply quintile classes

2. **[styles.css](styles.css)**
   - Added quintile color styles (`.quintile-1` through `.quintile-5`)
   - Added legend styles
   - Added responsive mobile styles
   - Added hover effects for each quintile

3. **[index.html](index.html)**
   - Added quintile legend above results table

### Performance Impact

- **Minimal**: Quintile calculation is O(n log n) due to sorting
- **Client-side**: All processing happens in the browser
- **No API changes**: Works with existing data structure

## Responsive Design

The quintile feature is fully responsive:

### Desktop
- Legend displays horizontally with all 5 quintiles
- Full color visibility on keyword rows

### Tablet
- Legend wraps to multiple lines if needed
- Colors remain visible

### Mobile
- Legend displays vertically
- Smaller color boxes
- Slightly smaller text
- All functionality preserved

## Accessibility

- **Color + Text**: Not relying on color alone (labels included)
- **High Contrast**: Dark green/red have sufficient contrast with white text
- **Hover States**: Interactive feedback on all quintile rows
- **Expandable Rows**: All functionality preserved

## Future Enhancements

Possible improvements:
- Toggle between different metrics (CPA, ROI, ROAS)
- Adjustable quintile thresholds
- Export quintile assignments
- Quintile filtering
- Historical quintile tracking
- Custom color schemes

---

**Feature Complete**: All keywords are now automatically color-coded by performance quintiles! 🎨✅
