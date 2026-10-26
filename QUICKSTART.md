# Bricktrack – Schnellstart

Von null auf laufende Instanz. Zeitbedarf: etwa 15 Minuten, davon 10 für den
ersten Docker-Build.

**Voraussetzungen:** Ein Linux-Host (z. B. eine LXC oder VM auf Proxmox) mit
Docker und dem Compose-Plugin, ein Reverse Proxy mit gültigem TLS-Zertifikat
und eine Subdomain, die auf den Proxy zeigt.

> **Warum HTTPS Pflicht ist:** Passkeys (WebAuthn) funktionieren
> ausschließlich über HTTPS und sind fest an den Hostnamen gebunden. Ohne
> Zertifikat bleibt nur die Anmeldung per Passwort. Wird die Domain später
> geändert, sind **alle** Passkeys ungültig und müssen neu angelegt werden.

---

## 1. Projekt holen

```bash
sudo mkdir -p /opt/bricktrack
sudo chown "$USER" /opt/bricktrack
git clone https://github.com/florianwilde/bricktrack.git /opt/bricktrack
cd /opt/bricktrack
```

## 2. Konfiguration anlegen

```bash
cp .env.example .env
```

Jetzt `.env` öffnen und zwei Werte setzen:

```bash
# Die Adresse, unter der du die App im Browser aufrufst.
BASE_URL=https://bricktrack.example.de

# Signiergeheimnis - hiermit erzeugen:
#   openssl rand -base64 48
BETTER_AUTH_SECRET=<dein-erzeugter-wert>
```

Alles andere kann so bleiben. `DATA_DIR=/data` ist der Pfad **im Container**
und wird nicht angefasst.

## 3. Datenverzeichnis vorbereiten

Der Container läuft aus Sicherheitsgründen nicht als root, sondern als Nutzer
mit der UID 1000. Das gemountete Verzeichnis muss ihm gehören:

```bash
mkdir -p ./data
sudo chown -R 1000:1000 ./data
```

Diesen Schritt vergisst man gern – der Container sagt dir dann aber beim Start
genau das.

## 4. Starten

```bash
docker compose up -d --build
```

Der erste Build dauert einige Minuten. Danach:

```bash
docker compose ps          # Status "healthy" abwarten
docker compose logs -f app # Log mitlesen, mit Strg+C beenden
curl -s http://127.0.0.1:3000/api/health
# {"status":"ok","time":"..."}
```

## 5. Reverse Proxy einrichten (Nginx Proxy Manager)

In NPM unter **Hosts → Proxy Hosts → Add Proxy Host**:

**Reiter „Details"**

| Feld | Wert |
|---|---|
| Domain Names | `bricktrack.example.de` |
| Scheme | `http` |
| Forward Hostname / IP | IP des Docker-Hosts, z. B. `192.168.1.50` |
| Forward Port | `3000` |
| Cache Assets | **aus** (Next.js setzt seine Cache-Header selbst) |
| Block Common Exploits | an |
| Websockets Support | **an** |

**Reiter „SSL"**

| Feld | Wert |
|---|---|
| SSL Certificate | Let's Encrypt anfordern oder vorhandenes wählen |
| Force SSL | **an** |
| HTTP/2 Support | an |
| HSTS Enabled | an (optional, aber sinnvoll) |

**Reiter „Advanced"** – hier hinein, sonst scheitern große Anleitungs-PDFs am
Standardlimit von 1 MB:

```nginx
# Anleitungs-PDFs koennen mehrere Megabyte gross sein.
client_max_body_size 64m;

# Uploads und PDF-Auslieferung duerfen etwas dauern.
proxy_read_timeout 300;
proxy_send_timeout 300;

# Die App leitet ihre oeffentliche Adresse und die Client-IP hieraus ab.
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Real-IP         $remote_addr;
```

`client_max_body_size` muss mindestens so groß sein wie `MAX_UPLOAD_MB` in
deiner `.env` (Standard 25 MB); 64m gibt Luft.

> **Wo lauscht der Container?** Voreinstellung ist `127.0.0.1:3000` – die App
> ist dann ausschließlich über einen Proxy auf demselben Host erreichbar.
> Zwei Fälle brauchen eine Anpassung in der `.env`:
>
> - **NPM läuft auf einem anderen Host:** `BIND_ADDRESS=0.0.0.0` setzen und
>   den Zugriff per Firewall auf die Proxy-IP beschränken.
> - **Port 3000 ist schon belegt:** `HOST_PORT=3001` (o. ä.) setzen und im
>   Proxy denselben Port eintragen.
>
> **Läuft NPM im selben Docker-Netz?** Dann brauchst du gar kein
> Port-Mapping: die `ports`-Zeile in `docker-compose.yml` entfernen, beide
> Container in ein gemeinsames Netzwerk hängen und als Forward Hostname den
> Container-Namen `bricktrack` mit Port `3000` eintragen.

## 6. Ersten Nutzer anlegen

`https://bricktrack.example.de` aufrufen. Die App leitet direkt auf die
Registrierung.

**Der erste registrierte Nutzer wird automatisch Administrator.** Danach ist
die Registrierung geschlossen – weitere Konten entstehen nur über einen
Einladungslink (ab Version 0.2.0).

Also: gleich beim ersten Aufruf selbst registrieren, bevor es jemand anderes
tut.

## 7. Passkey hinterlegen

Unter **Mehr → Konto & Passkeys → Passkey hinzufügen** (der Button „Mehr" oben rechts). Ab dann meldest du dich per
Fingerabdruck, Gesichtserkennung oder Geräte-PIN an. Für jedes Gerät ein
eigener Passkey – Handy, Tablet, Laptop.

## 8. Loslegen

1. **Mehr → Hersteller**: Lego, Playmobil, Cobi … anlegen.
2. **Mehr → Themen**: „City", „Technic", „Novelmore" …
3. **Mehr → Standorte**: „Regal Kinderzimmer", „Kiste Keller 3" …
4. **＋ in der Navigation → Von Hand**: Setnummer, Name, Bild.
5. Auf der Set-Seite **„Zur Sammlung hinzufügen"**, wenn das Set da ist.
6. **Katalog → Filter „Fehlt noch"**: Kachel lange drücken, mehrere auswählen,
   **„Zur Wunschliste hinzufügen"**.
7. **Wunschlisten → Liste öffnen → Link kopieren** und verschicken.

Wie das im Einzelnen aussieht, zeigt die [bebilderte
Anleitung](docs/ANLEITUNG.md).

> Beispieldaten (`pnpm db:seed`) gibt es nur in der Entwicklungsumgebung – das
> Produktions-Image bringt sie bewusst nicht mit, damit in deiner Sammlung
> nichts steht, was dir nicht gehört.

---

## Sichern

Alles, was zählt, liegt in **einem** Verzeichnis:

```bash
docker compose stop app
tar czf bricktrack-$(date +%F).tar.gz data .env
docker compose start app
```

Zurückspielen:

```bash
docker compose down
tar xzf bricktrack-2026-09-06.tar.gz
sudo chown -R 1000:1000 ./data
docker compose up -d
```

## Aktualisieren

```bash
./update.sh
```

Das Skript sichert vorher automatisch, baut neu, wartet auf den Healthcheck
und rollt bei einem Fehlschlag zurück. Details in der [README](README.md).

---

## Wenn etwas klemmt

| Symptom | Ursache und Lösung |
|---|---|
| `FEHLER: In /data darf nicht geschrieben werden` | `sudo chown -R 1000:1000 ./data` |
| Container startet, aber `unhealthy` | `docker compose logs app` – meist eine fehlende Variable in `.env` |
| `Ungueltige Umgebungsvariablen: BETTER_AUTH_SECRET` | Das Geheimnis braucht mindestens 32 Zeichen |
| Passkey lässt sich nicht anlegen | Kein HTTPS, oder `BASE_URL` passt nicht zur aufgerufenen Domain |
| Passkeys funktionieren nach einem Domainwechsel nicht mehr | Erwartet – Passkeys sind an die Domain gebunden, neu anlegen |
| `413 Request Entity Too Large` beim PDF-Upload | `client_max_body_size` im Proxy erhöhen (Schritt 5) |
| Anmeldung meldet „Zu viele Versuche" | Rate-Limit: fünf Fehlversuche pro Minute, danach kurz warten |
