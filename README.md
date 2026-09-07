# Big Brother Clients Editor

Client master-data editor for BIG BROTHER.

## Main menu

- Add Client
- All Clients Products & Price
- All Client Detail (review and edit; no delete)

## Deploy

1. Copy `Code.gs` into the Apps Script project attached to the Master Database.
2. Confirm the sheets are named `Clients`, `Client Products`, and `Client Prices` and use the headers declared in `CLIENT_EDITOR`.
3. Deploy the Apps Script as a Web App, executing as the owner and allowing the required users.
4. Put the deployment `/exec` URL into `API_URL` in `index.html`.
5. Enable GitHub Pages for the repository's `main` branch.
