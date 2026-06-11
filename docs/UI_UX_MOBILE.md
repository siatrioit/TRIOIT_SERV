# UI/UX rekomendācijas mobilajām ierīcēm

## Dizaina principi

1. **Mobile-first** — vispirms 320px platumam, pēc tam desktop
2. **Vienas rokas lietošana** — galvenās darbības apakšā
3. **Minimāls teksta ievades apjoms** — balss prioritāte
4. **Skaidra vizuālā hierarhija** — statusi un prioritātes ar krāsām

## Navigācija

### Bottom Navigation Bar (implementēts)
- 5 galvenās sadaļas: Sākums, Atgadījumi, Klienti, Karte, Rēķini
- Min 64px platums katram elementam
- Aktīvā sadaļa: primary krāsa
- Safe area support iPhone (notch/home indicator)

### Quick Action FAB
- Peldoša `+` poga labajā apakšējā stūrī
- Tiešs ceļš uz "Jauns atgadījums"
- 56px diametrs, augsts kontrasts

## Touch optimizācija

| Elements | Min izmērs | Piezīmes |
|----------|-----------|----------|
| Pogas | 48×48px | `.btn-primary` ar `min-h-[48px]` |
| Input lauki | 48px augstums | `text-base` (novērš iOS zoom) |
| Saraksta elementi | 56px augstums | Liela klikšķa zona |
| Balss poga | 64×64px | `.btn-voice` apaļa, sarkana |

## Krāsu kodēšana

### Prioritātes
- Zema: pelēka
- Vidēja: zila
- Augsta: oranža
- Kritiska: sarkana + vibrācija (nākotnē)

### Statusi
- Gaida: dzeltena
- Darbā: zila
- Pauze: pelēka
- Izpildīts: zaļa

## Balss ievade

- Mikrofona poga centrā "Jauns atgadījums" lapā
- Pulsējoša animācija klausīšanās laikā
- Brīdinājums, ja AI confidence < 70%
- Korekcijas forma pirms saglabāšanas

## Offline režīms

PWA ar Service Worker:
- Cache: statiskie faili, pēdējie atgadījumi
- IndexedDB: melnrakstu atgadījumi
- Sync queue: POST pieprasījumi, kad tīkls atgriežas
- Offline indikators headerā

## Karte

- Pilnekrāna režīms mobilajā
- Klasterēti marķieri blīvās zonās
- Tap uz marķiera → ātrais skats + "Jauns atgadījums"
- GPS "Mana atrašanās vieta" tehniķiem

## Formu UX

- Autocomplete klientu/vienību meklēšanai
- Datuma/time pickers native (iOS/Android)
- Progress stepper garām formām
- "Saglabāt melnrakstu" automātiski

## Pieejamība

- ARIA labels visām ikonu pogām
- Kontrasts WCAG AA
- Atbalsts ekrāna lasītājiem status badges
