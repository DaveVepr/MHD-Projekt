// --- GLOBÁLNÍ PROMĚNNÉ ---
let aktualniData_A = null;
let aktualniData_B = null;
let aktualniData_C = null;

let staniceIntervalStahovani = null;
let staniceIntervalKresleni = null;
let aktualniDataStanice = null;
let aktualniPoleLinekStanice = null;

// --- INICIALIZACE HLAVNÍCH SMYČEK ---
const hodinyElement = document.getElementById('hlavni_cas');
aktualizaceHlavnihoCasu(hodinyElement);

// Smyčka pro stahování dat o vlacích z API každých 10 vteřin
setInterval(function () { 
    zpracovaniDat("A");
    zpracovaniDat("B");
    zpracovaniDat("C");
}, 10000);

// Smyčka pro plynulý chod hodin, přepočet textových časů a posun vlaků na mapě (1x za vteřinu)
setInterval(function () {
    aktualizaceHlavnihoCasu(hodinyElement);
    rozpisovaniDat(aktualniData_A);
    rozpisovaniDat(aktualniData_B);
    rozpisovaniDat(aktualniData_C);

    if (aktualniData_A) zpracovaniDatProVlaky(aktualniData_A);
    if (aktualniData_B) zpracovaniDatProVlaky(aktualniData_B);
    if (aktualniData_C) zpracovaniDatProVlaky(aktualniData_C);
}, 1000);

// Aktualizuje digitální hodiny v pravém horním rohu aplikace
function aktualizaceHlavnihoCasu(cas) {
    let aktualni_cas = new Date();
    const hodiny = aktualni_cas.getHours().toString().padStart(2, '0');
    const minuty = aktualni_cas.getMinutes().toString().padStart(2, '0');
    const vteriny = aktualni_cas.getSeconds().toString().padStart(2, '0');
    cas.innerHTML = `${hodiny}:${minuty}:${vteriny}`;
}

// Počítá přesný čas do příjezdu/odjezdu vlaku s ohledem na jeho aktuální zpoždění
function prelozitCas(Cas, delay, naTrati) {
    const datum = new Date(Cas);
    const konecnyCas = new Date(datum.getTime() + (delay * 1000));
    const realnyCas = new Date();
    const rozdilMs = konecnyCas.getTime() - realnyCas.getTime();

    if (rozdilMs <= 0) {
        if (naTrati == "at_stop") {
            return "Vlak právě odjíždí ze stanice";
        } else {
            return "Vlak právě přijíždí do stanice";
        }
    }

    const celkemVterin = Math.floor(rozdilMs / 1000);
    const minuty = Math.floor(celkemVterin / 60).toString().padStart(2, '0');
    const vteriny = (celkemVterin % 60).toString().padStart(2, '0');

    if (naTrati == "at_stop") {
        return `Vlak odjíždí za: ${minuty}:${vteriny}`;
    } else {
        return `Vlak přijíždí za: ${minuty}:${vteriny}`;
    }
}

// Stahuje surová data o vlacích z Golemia přes zabezpečenou PHP proxy
function zpracovaniDat(linka) {
    const urlProDotaz = `proxy.php?linka=${linka}`;

    fetch(urlProDotaz)
        .then(response => response.json())
        .then(data => {
            switch (linka) {
                case "A": aktualniData_A = data; break;
                case "B": aktualniData_B = data; break;
                case "C": aktualniData_C = data; break;
            }
            zpracovaniDatProVlaky(data);
            rozpisovaniDat(data);
        })
        .catch(error => console.error(`Chyba při stahování linky ${linka}:`, error));
}

// Vykresluje textový seznam vlaků a jejich progress bary pro danou linku
function rozpisovaniDat(data) {
    if (!data) return;

    const seznamVlaku = data.features;
    const route_short_name = seznamVlaku[0].properties.trip.gtfs.route_short_name;
    let stavyVozu = document.getElementById('stavy_vozu_' + route_short_name);
    stavyVozu.innerHTML = "";

    seznamVlaku.sort((a, b) => a.properties.trip.gtfs.trip_id.localeCompare(b.properties.trip.gtfs.trip_id));

    seznamVlaku.forEach(array => {
        let htmlVlaku = "";
        const cil = array.properties.trip.gtfs.trip_headsign;
        const idPosledniStanice = array.properties.last_position.last_stop.id;
        const idDalseStanice = array.properties.last_position.next_stop.id;

        const kratkeIdPosledni = idPosledniStanice.substring(0, idPosledniStanice.indexOf('Z') + 1);
        const kratkeIdDalsi = idDalseStanice.substring(0, idDalseStanice.indexOf('Z') + 1);

        const datumOdjezdu = new Date(array.properties.last_position.last_stop.departure_time);
        const datumPrijezdu = new Date(array.properties.last_position.next_stop.arrival_time);
        const zpozdeni = array.properties.last_position.delay.actual;
        const naTrati = array.properties.last_position.state_position;

        const objPosledniStanice = STANICE[kratkeIdPosledni];
        const objDalsiStanice = STANICE[kratkeIdDalsi];

        if (!objPosledniStanice || !objDalsiStanice) return;

        let procenta = 0;

        if (naTrati === "on_track") {
            const zpozdeni_v_mS = zpozdeni * 1000;
            const start = datumOdjezdu.getTime() + zpozdeni_v_mS;
            const cilCas = datumPrijezdu.getTime() + zpozdeni_v_mS;
            const ted = new Date().getTime();

            const celkovaCesta = cilCas - start;
            const ujetaCesta = ted - start;

            if (celkovaCesta > 0) {
                procenta = (ujetaCesta / celkovaCesta) * 100;
            }
            procenta = Math.max(0, Math.min(100, procenta));
        }

        let nadpisTextu = "";
        let staniceText = "";
        let casText = "";

        if (naTrati === "at_stop") {
            nadpisTextu = "VLAK JE MOMENTÁLNĚ VE STANICI:";
            staniceText = objPosledniStanice.text;
            casText = prelozitCas(datumOdjezdu, zpozdeni, naTrati);
            procenta = 0;
        } else {
            nadpisTextu = "VLAK JEDE DO STANICE:";
            staniceText = objDalsiStanice.text;
            casText = prelozitCas(datumPrijezdu, zpozdeni, naTrati);
        }

        htmlVlaku += `
        <div class="souprava" style="cursor: pointer;" onclick="zobrazDetailVlaku('${array.properties.trip.gtfs.trip_id}')">
            <h3>${cil}</h3>
            <p class="text_nad_pozice">${nadpisTextu}</p>
            <p class="pozice">${staniceText}</p>
            <div class="progress-track">
                <div class="progress-bar" style="width: ${procenta}%;"></div>
            </div>
            <p class="cas">${casText}</p>
        </div>
    `;
        stavyVozu.innerHTML += htmlVlaku;
    });
}

// Aktualizuje pozice všech vlaků jedné linky na mapě a čistí ty, co už dojely
function zpracovaniDatProVlaky(dataZGolemia) {
    if (!dataZGolemia.features || dataZGolemia.features.length === 0) return;

    const linka = dataZGolemia.features[0].properties.trip.gtfs.route_short_name;
    const aktualniIdVlaku = dataZGolemia.features.map(vlak => "vlak_" + vlak.properties.trip.gtfs.trip_id.replace(/[^a-zA-Z0-9]/g, "_"));

    document.querySelectorAll(`.linka-${linka}`).forEach(puntik => {
        if (!aktualniIdVlaku.includes(puntik.id)) puntik.remove();
    });

    dataZGolemia.features.forEach(vlak => {
        vykresliVlak(vlak, linka);
    });
}

// Přepíná viditelnost hlavních sekcí webu a resetuje stav stahování stanic
function ukazSekci(idKtereChciUkazat, tlacitko) {
    document.querySelectorAll('.obsah-sekce').forEach(sekce => {
        sekce.style.display = 'none';
    });

    document.getElementById(idKtereChciUkazat).style.display = 'block';
    window.scrollTo(0, 0);

    document.querySelectorAll('.navbar button').forEach(btn => {
        btn.classList.remove('active');
    });

    if (tlacitko) {
        tlacitko.classList.add('active');
    }

    if (idKtereChciUkazat !== 'sekce-stanice') {
        clearInterval(staniceIntervalStahovani);
        clearInterval(staniceIntervalKresleni);
        aktualniDataStanice = null;
    }
}

// Vypočítá přesnou procentuální polohu konkrétního vlaku mezi stanicemi pro vykreslení
function vykresliVlak(vlakData, linka) {
    const idVlaku = vlakData.properties.trip.gtfs.trip_id;
    const info = vlakData.properties.last_position;
    const idDalsi = info.next_stop.id;
    const idMinula = info.last_stop.id;
    const stav = info.state_position;

    const kratkeIdDalsi = idDalsi.substring(0, idDalsi.indexOf('Z') + 1);
    const kratkeIdMinula = idMinula.substring(0, idMinula.indexOf('Z') + 1);

    const objDalsi = STANICE[kratkeIdDalsi];
    const objMinula = STANICE[kratkeIdMinula];

    if (!objDalsi || !objMinula) return;

    const nazevMinula = objMinula.mapa;
    const bodStart = { x: objMinula.x, y: objMinula.y };
    const bodCil = { x: objDalsi.x, y: objDalsi.y };

    if (bodStart && bodCil) {
        let x, y;
        let jeVidet = true;

        if (stav === "at_stop") {
            x = bodStart.x;
            y = bodStart.y;
            rozblikatStanici(nazevMinula);
            jeVidet = false;
        } else {
            const casOdjezdu = new Date(info.last_stop.departure_time).getTime();
            const casPrijezdu = new Date(info.next_stop.arrival_time).getTime();
            const zpozdeni = info.delay.actual * 1000;

            const start = casOdjezdu + zpozdeni;
            const cil = casPrijezdu + zpozdeni;
            const ted = new Date().getTime();

            let procenta = 0.5;
            const celkovaDoba = cil - start;
            const ubehnutaDoba = ted - start;

            if (celkovaDoba > 0) {
                procenta = ubehnutaDoba / celkovaDoba;
            }

            if (procenta > 1) procenta = 1;
            if (procenta < 0) procenta = 0;

            x = bodStart.x + (bodCil.x - bodStart.x) * procenta;
            y = bodStart.y + (bodCil.y - bodStart.y) * procenta;
            jeVidet = true;
        }

        nakresliVlak(x, y, idVlaku, jeVidet, linka);
    }
}

// Fyzicky posune nebo vytvoří interaktivní SVG kroužek vlaku na mapě
function nakresliVlak(x, y, id, zobrazit, linka) {
    const svg = document.querySelector('svg');
    const bezpecneId = "vlak_" + id.replace(/[^a-zA-Z0-9]/g, "_");
    let vlakElement = document.getElementById(bezpecneId);

    if (!vlakElement) {
        vlakElement = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        vlakElement.setAttribute("id", bezpecneId);
        vlakElement.setAttribute("class", `vlak-metro linka-${linka}`);
        vlakElement.style.cursor = "pointer";
        vlakElement.onclick = () => zobrazDetailVlaku(id);

        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = id;
        vlakElement.appendChild(title);
        svg.appendChild(vlakElement);
    }

    vlakElement.setAttribute("cx", x);
    vlakElement.setAttribute("cy", y);

    if (zobrazit === true) {
        vlakElement.style.display = "block";
    } else {
        vlakElement.style.display = "none";
    }
}

// Zajistí probliknutí stanice, pokud v ní zrovna stojí vlak
function rozblikatStanici(staniceIdZSVG) {
    const staniceElement = document.getElementById(staniceIdZSVG);
    if (staniceElement) {
        if (staniceElement.classList.contains("blikani")) {
            return;
        }
        staniceElement.classList.add("blikani");
        setTimeout(() => {
            staniceElement.classList.remove("blikani");
        }, 9000);
    }
}

// --- LOGIKA PRO POSOUVÁNÍ MAPY PACIČKOU (Zajišťuje posun myší) ---
const mapaKontejner = document.querySelector('.mapa-kontejner');
let jeStisknuto = false;
let startX;
let startY;
let scrollDoleva;
let scrollNahoru;

mapaKontejner.addEventListener('mousedown', (e) => {
    jeStisknuto = true;
    startX = e.pageX - mapaKontejner.offsetLeft;
    startY = e.pageY - mapaKontejner.offsetTop;
    scrollDoleva = mapaKontejner.scrollLeft;
    scrollNahoru = mapaKontejner.scrollTop;
});

mapaKontejner.addEventListener('mouseleave', () => { jeStisknuto = false; });
mapaKontejner.addEventListener('mouseup', () => { jeStisknuto = false; });

mapaKontejner.addEventListener('mousemove', (e) => {
    if (!jeStisknuto) return;
    e.preventDefault();
    const x = e.pageX - mapaKontejner.offsetLeft;
    const y = e.pageY - mapaKontejner.offsetTop;
    const posunX = (x - startX) * 1.5;
    const posunY = (y - startY) * 1.5;
    mapaKontejner.scrollLeft = scrollDoleva - posunX;
    mapaKontejner.scrollTop = scrollNahoru - posunY;
});

// Vycentruje SVG mapu doprostřed obrazovky po jejím načtení
function vycentrujMapu() {
    const kontejner = document.querySelector('.mapa-kontejner');
    if (kontejner) {
        const stredX = (kontejner.scrollWidth - kontejner.clientWidth) / 2;
        kontejner.scrollLeft = stredX;
    }
}

// Oživí stanice na mapě a nastaví na ně klikací události
function nastavKlikaniNaStanice() {
    for (const id in STANICE) {
        const nazevSVG = STANICE[id].mapa;
        const svgElement = document.getElementById(nazevSVG);

        if (svgElement) {
            svgElement.style.cursor = "pointer";
            svgElement.classList.add("stanice");

            svgElement.onclick = () => {
                let hezkyNazev = "";
                let poleLinek = "";
                let odjezdyDotaz = "";

                for (const hledaneId in STANICE) {
                    if (STANICE[hledaneId].mapa === nazevSVG) {
                        hezkyNazev = STANICE[hledaneId].text;
                        poleLinek = STANICE[hledaneId].linky;
                        odjezdyDotaz = STANICE[hledaneId].odjezdy.join(",");
                    }
                }
                otevriDetailStanice(odjezdyDotaz, hezkyNazev, poleLinek);
            };
        }
    }
}

// Spustí prvotní stažení mapy a následně načte vlaky z Golemia
window.addEventListener('load', () => {
    fetch('mapa.svg')
        .then(response => response.text())
        .then(svgKolo => {
            document.getElementById('mapa-kontejner').innerHTML = svgKolo;
            vycentrujMapu();
            nastavKlikaniNaStanice();
            
            zpracovaniDat("A");
            zpracovaniDat("B");
            zpracovaniDat("C");
        })
        .catch(error => console.error("Chyba při načítání mapy:", error));

    vygenerujSeznamStanic();
});

// Připraví UI pro konkrétní stanici a spustí stahování odjezdů
function otevriDetailStanice(golemioId, hezkyNazev, poleLinek) {
    const info = najdiInfoOStanici(golemioId);
    vykresliHlavickuStanice(info.nazevZMapy, info.maPlanek, hezkyNazev);
    vykresliOdjezdyStanice(golemioId, poleLinek);
}

// Hledání pomocných informací o stanici v našem lokálním slovníku
function najdiInfoOStanici(golemioId) {
    let nazevZMapy = "Praha";
    let maPlanek = false;
    for (const id in STANICE) {
        if (golemioId.includes(id)) {
            nazevZMapy = STANICE[id].mapa;
            maPlanek = STANICE[id].maPlanek;
            break;
        }
    }
    return { nazevZMapy, maPlanek };
}

// Upraví hlavičku, nahraje PDF plánek (pokud existuje) a přepne sekci
function vykresliHlavickuStanice(nazevZMapy, maPlanek, hezkyNazev) {
    const pdfNazev = nazevZMapy.replace(/_/g, '-');
    const pdfOdkaz = `https://pid.cz/wp-content/uploads/mapy/uzly-praha/${pdfNazev}.pdf#toolbar=0&navpanes=0&scrollbar=0&view=Fit`;
    const pdfKontejner = document.querySelector('.stanice-schema-kontejner');
    const iframe = document.getElementById('stanice-pdf');

    if (maPlanek) {
        iframe.src = pdfOdkaz;
        pdfKontejner.style.display = "flex";
    } else {
        iframe.src = "";
        pdfKontejner.style.display = "none";
    }

    document.getElementById('stanice-hlavicka').style.backgroundImage = `url('obrazky/${nazevZMapy}.jpg')`;
    ukazSekci('sekce-stanice', null);
    document.getElementById('nadpis_rozkliknute_stanice').innerText = hezkyNazev;
}

// Manažer spouštění: nastaví intervaly pro stahování a překreslování odjezdových tabulí
function vykresliOdjezdyStanice(golemioId, poleLinek) {
    aktualniPoleLinekStanice = poleLinek; 
    clearInterval(staniceIntervalStahovani);
    clearInterval(staniceIntervalKresleni);

    stahniOdjezdyStanice(golemioId);

    staniceIntervalStahovani = setInterval(() => {
        stahniOdjezdyStanice(golemioId);
    }, 10000);

    staniceIntervalKresleni = setInterval(() => {
        prekresliOdjezdyStaniceUI();
    }, 1000);
}

// Provede HTTP dotaz na API Golemia pro zjištění odjezdů z dané stanice
function stahniOdjezdyStanice(golemioId) {
    const kontejner = document.getElementById('odjezdy-kontejner');
    if (!aktualniDataStanice) {
        kontejner.innerHTML = "<p style='color: gray; text-align: center; padding: 20px; font-size: 18px;'>Načítám odjezdy...</p>";
    }

    fetch(`proxy_stanice.php?ids=${golemioId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                kontejner.innerHTML = `<p style='color: red; text-align: center;'>${data.error}</p>`;
                return;
            }
            aktualniDataStanice = data.departures || data;
            prekresliOdjezdyStaniceUI();
        })
        .catch(error => {
            console.error("Chyba při stahování stanice:", error);
            kontejner.innerHTML = "<p style='color: red; text-align: center;'>Chyba při načítání dat</p>";
        });
}

// Filtruje stažená data podle linek a volá továrnu na HTML
function prekresliOdjezdyStaniceUI() {
    if (!aktualniDataStanice || !Array.isArray(aktualniDataStanice)) return;

    const kontejner = document.getElementById('odjezdy-kontejner');
    kontejner.innerHTML = "";
    const nyni = new Date();

    aktualniPoleLinekStanice.forEach(linka => {
        const odjezdyTetoLinky = aktualniDataStanice.filter(odj => odj.route.short_name === linka);
        const htmlBlokLinky = vytvorHtmlProLinku(linka, odjezdyTetoLinky, nyni); 
        kontejner.innerHTML += htmlBlokLinky;
    });
}

// Vytvoří HTML sloupečky s odjezdy pro Kolej 1 a Kolej 2 konkrétní linky
function vytvorHtmlProLinku(linka, odjezdyLinky, nyni) {
    let kolej1HTML = "";
    let kolej2HTML = "";
    let pocetKolej1 = 0;
    let pocetKolej2 = 0;

    odjezdyLinky.forEach(odjezd => {
        let cil = odjezd.trip?.headsign || "Neznámý cíl";
        let casOdjezduZ_API = odjezd.predicted || odjezd.departure_timestamp?.predicted || odjezd.departure_timestamp?.scheduled;
        if (!casOdjezduZ_API) return;

        const casOdjezdu = new Date(casOdjezduZ_API);
        const rozdilSekundy = Math.floor((casOdjezdu - nyni) / 1000);
        if (rozdilSekundy < -30) return;

        let zobrazenyCas = "";
        if (rozdilSekundy <= 30) {
            zobrazenyCas = "Ve stanici";
        } else {
            const minuty = Math.floor(rozdilSekundy / 60);
            const sekundy = rozdilSekundy % 60;
            zobrazenyCas = `${minuty}:${sekundy.toString().padStart(2, '0')}`;
        }

        const radekHTML = `
            <div class="odjezd-radek">
                <span class="odjezd-cil">${cil}</span>
                <span class="odjezd-cas">${zobrazenyCas}</span>
            </div>
        `;

        let cisloKoleje = odjezd.stop.platform_code || "";
        let idZastavky = odjezd.stop.id || "";
        let jeToKolej1 = (cisloKoleje === "1" || idZastavky.includes("1P"));

        if (jeToKolej1) {
            if (pocetKolej1 < 5) { kolej1HTML += radekHTML; pocetKolej1++; }
        } else {
            if (pocetKolej2 < 5) { kolej2HTML += radekHTML; pocetKolej2++; }
        }
    });

    let barvaTrida = "bg-A";
    if (linka === "B") barvaTrida = "bg-B";
    if (linka === "C") barvaTrida = "bg-C";

    return `
        <div class="pruh-linky ${barvaTrida}">
            ${linka}
        </div>
        <div class="koleje-kontejner">
            <div class="kolej-sloupec">
                <div class="kolej-nadpis">Kolej <span class="kolej-cislo">1</span></div>
                ${kolej1HTML}
            </div>
            <div class="kolej-sloupec">
                <div class="kolej-nadpis">Kolej <span class="kolej-cislo">2</span></div>
                ${kolej2HTML}
            </div>
        </div>
    `;
}

// Vygeneruje klikací statický seznam všech dostupných stanic do levého menu
function vygenerujSeznamStanic() {
    const kontejnerA = document.getElementById('seznam-A');
    const kontejnerB = document.getElementById('seznam-B');
    const kontejnerC = document.getElementById('seznam-C');

    for (const id in STANICE) {
        const stanice = STANICE[id];
        const odjezdyDotaz = stanice.odjezdy.join(",");
        const div = document.createElement('div');
        div.className = 'stanice-polozka';
        div.innerText = stanice.text;
        
        div.onclick = () => {
            otevriDetailStanice(odjezdyDotaz, stanice.text, stanice.linky);
        };

        if (stanice.linky.includes("A")) kontejnerA.appendChild(div);
        if (stanice.linky.includes("B")) kontejnerB.appendChild(div);
        if (stanice.linky.includes("C")) kontejnerC.appendChild(div); 
    }
}

// Zobrazí modální okno s detailním itinerářem pro konkrétní vlak
function zobrazDetailVlaku(tripId) {
    document.getElementById('modal-vlak').style.display = "block";
    document.getElementById('modal-nadpis').innerText = "Načítám...";
    
    const seznamDiv = document.getElementById('modal-seznam');
    seznamDiv.innerHTML = "<p style='text-align:center;'>Načítám stanice...</p>";

    fetch(`proxy_vlak.php?id=${tripId}`)
        .then(res => res.json())
        .then(data => {
            let html = "";
            const zastavky = data.stop_times || data; 
            
            if (Array.isArray(zastavky) && zastavky.length > 0) {
                let cilovaStanice = "Neznámý cíl";
                const posledni = zastavky[zastavky.length - 1];
                let idKonecne = (posledni.stop && posledni.stop.id) ? posledni.stop.id : posledni.stop_id;
                
                if (idKonecne && idKonecne.includes('Z')) {
                    const kratkeId = idKonecne.substring(0, idKonecne.indexOf('Z') + 1);
                    if (STANICE[kratkeId]) cilovaStanice = STANICE[kratkeId].text;
                }
                
                document.getElementById('modal-nadpis').innerText = "Vlak směr: " + cilovaStanice;

                zastavky.forEach(zastavka => {
                    let idStanice = (zastavka.stop && zastavka.stop.id) ? zastavka.stop.id : zastavka.stop_id;
                    let nazev = "Neznámá stanice";
                    
                    if (idStanice && idStanice.includes('Z')) {
                        const kratkeId = idStanice.substring(0, idStanice.indexOf('Z') + 1);
                        if (STANICE[kratkeId]) nazev = STANICE[kratkeId].text; 
                    }
                    
                    if (nazev === "Neznámá stanice") {
                        if (zastavka.stop && zastavka.stop.stop_name) nazev = zastavka.stop.stop_name;
                        else if (zastavka.stop_name) nazev = zastavka.stop_name;
                    }

                    let cas = (zastavka.departure_time || zastavka.arrival_time || "??:??").substring(0, 5); 
                    
                    html += `
                    <div class="zastavka-radek">
                        <span class="zastavka-nazev">${nazev}</span>
                        <span class="zastavka-cas">${cas}</span>
                    </div>`;
                });
            } else {
                document.getElementById('modal-nadpis').innerText = "Detail vlaku";
                html = "<p style='text-align:center; color:gray;'>Detailní itinerář pro tento spoj není v Golemiu právě dostupný.</p>";
            }
            seznamDiv.innerHTML = html;
        });
}

// Zavře modální okno detailu vlaku
function zavriDetailVlaku() {
    document.getElementById('modal-vlak').style.display = "none";
}