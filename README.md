# Mapa a odjezdy Pražského metra

Interaktivní webová aplikace, která v reálném čase zobrazuje polohy souprav pražského metra (linky A, B, C) a živé odjezdové tabule pro všechny stanice.

## Funkce
* **Živá mapa:** Vlaky se pohybují po mapě na základě výpočtu jejich zpoždění a jízdního řádu.
* **Odjezdové tabule:** Interaktivní seznam odjezdů po kliknutí na jakoukoliv stanici.
* **Detail vlaku:** Možnost rozkliknout konkrétní soupravu a vidět její cílovou stanici a jízdní řád.
* **Ochrana API:** Backend obsahuje PHP proxy skripty, které řeší CORS a používají cache, aby nedošlo k přetížení Golemio API.

## Použité technologie
* **Frontend:** HTML, CSS, JavaScript
* **Backend:** PHP (Proxy + Cache)
* **Data:** Otevřená data Hlavního města Prahy (Golemio API v2)

## Upozornění k repozitáři
Z bezpečnostních důvodů jsou v PHP souborech v tomto repozitáři odstraněny osobní API klíče. Pro zprovoznění na vlastním serveru je nutné doplnit vlastní Golemio Access Token.
