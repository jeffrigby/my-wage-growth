1. User Flow & Features:
- What's the main user journey? (e.g., enter wages → select time period → view results)

When the user first comes to the page they should see a description of what the app does and why inflation is important to your wages. 
I think it might be useful to pre-load some sample data if it's the first time the user has visitied the site.
There should be a clear button to clear the example data and start entering their own data.

- Should users be able to compare wages across multiple time periods?

The point of the app is to compare wages from specific times and adjust it for inflation
The user will need to enter at least two sets of wages to see the growth over time.

- Do you want to support multiple countries (US, UK, Canada) with a country selector?

The user will start by entering the country and whether they want to enter their wages in USD, CAD, or GBP.
Then they will choose wheter to enter wages for a year or a pay period. 
This will determine how the app calculates the wage growth.
For annual, the user can only choose a year. For paycheck they'll enter the exact paycheck date.
It's very important that the user enters the wages pre-tax and pre-deduction, and they should be informed of this and why 
(possibly with a short blurb with an option to expand it for more detailed info)

- Any specific visualizations? (charts, graphs, or just numerical results)

Yes, initially let's start with a graph showing their wage growth vs inflation growth over time. 
It should show the wages adjusted in todays dollars, so the user can see how their wages have changed in real terms.

2. Design & Layout:
- Do you have a preference for UI framework? (Material-UI, Tailwind CSS, Ant Design, etc.)
Tailwinds v 4.1 (already installed)

- Desktop-first or mobile-first design?
Respnsive design that works on both.

- Single page app or multiple pages/views?
Basically a single app, but you can use React Router to navigate between some different help pages
I also want to be able to share tables via a URL, so the user can share their results with others.
This is defined in the main implementation plan (gzipped/base64 encoded JSON in the URL).

3. Data & Calculations:
- Should wage calculations be saved/persisted (localStorage, etc.)?
Yes, for sure. Redux Toolkit is already installed but not configured. The state should persist across page reloads.

- Do you want preset time periods (last year, 5 years, 10 years) or custom date ranges?
No preset time periods, the user should be able to enter any date range they want. We'll need to ensure we have the CPI data for it though.

- Should we show category breakdowns (housing, food, transportation) or just overall CPI?
For not, just user the overall CPI. We can add category breakdowns later if needed.

4. Additional Features:
- Export/share results functionality?
Talked about above

- Educational content about CPI/inflation?
Yes, maybe on a separate page that the user can access from the main page.
There should be a short blurb about what inflation and how it affects wage growth on the main page with a link to a more detailed page.

- Historical wage comparison tool?
It's solely based on what the user enters.
