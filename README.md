# Organization Data Aggregator

A web-based application that consolidates data from multiple Excel sheets (representing different properties) and generates an aggregated report at the organization level.

## Features

- Upload Excel files with multiple sheets
- Automatically detects and processes all sheets in the workbook
- Consolidates duplicate keywords across all sheets
- Aggregates conversions and costs for each unique keyword
- Multi-level expandable breakdown by Property, Campaign, and Ad Group
- Displays comprehensive statistics
- Export aggregated data to Excel format
- Drag-and-drop file upload support
- Responsive design for mobile and desktop

## How It Works

1. **Upload**: Select or drag & drop an Excel file containing multiple sheets
2. **Review**: View all detected sheets in your file
3. **Process**: Click "Process Data" to aggregate the data
4. **Analyze**: View the consolidated report with statistics
5. **Expand**: Click on any keyword row to see breakdown by Property, Campaign, and Ad Group
6. **Export**: Download the aggregated data as an Excel file

## Data Format

### Input Format (Each Sheet)
Each sheet should contain the following columns:
- **Keyword**: The keyword/search term
- **Campaign**: Campaign name
- **Ad Group**: Ad group name
- **Conversions**: Number of conversions
- **Cost**: Cost amount

### Output Format - Level 1 (Aggregated)
The aggregated report contains:
- **Keyword**: Unique keywords (duplicates merged)
- **Conversions**: Total conversions across all sheets
- **Cost**: Total cost across all sheets

### Output Format - Level 2 (Detailed Breakdown)
When you expand a keyword row, you see:
- **Property**: Which sheet/property the data came from
- **Campaign**: Campaign name
- **Ad Group**: Ad group name
- **Conversions**: Conversions for that specific combination
- **Cost**: Cost for that specific combination

## Usage

1. Open `index.html` in a web browser
2. Click "Choose Excel File" or drag and drop your Excel file
3. Review the detected sheets
4. Click "Process Data" to generate the aggregated report
5. Click on any keyword row to expand and see the breakdown by Property, Campaign, and Ad Group
6. Use "Export to Excel" to download the aggregated results

## Technical Details

- Built with vanilla JavaScript, HTML5, and CSS3
- Uses [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) library for Excel file processing
- Client-side processing (no server required)
- No data is uploaded to any server - all processing happens locally in your browser

## Browser Support

Works in all modern browsers that support:
- FileReader API
- ES6 JavaScript
- CSS Grid and Flexbox

## Example

If you have 3 sheets with the following data:

**Sheet 1 (Property A):**
| Keyword | Campaign | Ad Group | Conversions | Cost |
|---------|----------|----------|-------------|------|
| shoes   | Summer   | Running  | 10          | 100  |
| boots   | Winter   | Casual   | 5           | 75   |

**Sheet 2 (Property B):**
| Keyword | Campaign | Ad Group | Conversions | Cost |
|---------|----------|----------|-------------|------|
| shoes   | Fall     | Sports   | 15          | 150  |
| sandals | Summer   | Beach    | 8           | 60   |

**Aggregated Output:**
| Keyword | Conversions | Cost |
|---------|-------------|------|
| shoes   | 25          | 250  |
| boots   | 5           | 75   |
| sandals | 8           | 60   |

**When you expand the "shoes" keyword, you'll see:**
| Property | Campaign | Ad Group | Conversions | Cost |
|----------|----------|----------|-------------|------|
| Property A | Summer | Running | 10 | 100 |
| Property B | Fall | Sports | 15 | 150 |

## License

MIT License - feel free to use and modify as needed.
