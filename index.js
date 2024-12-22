const fs = require('fs');
const express = require('express');
const app = express();
const PORT = 3300;
const path = require('path');
const { Pool } = require('pg');

app.use(express.json());

const usersFile = path.join(__dirname, 'user.json');
const vehiclesFilePath = path.join(__dirname, 'fahrzeuge.json');



// Benutzerdaten laden
app.get('/users', (req, res) => {
    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        res.json(JSON.parse(data));
    });
});

// Verbindung zur Datenbank herstellen
const pool = new Pool({
  user: 'username',
  host: 'your-database-host',
  database: 'your-database-name',
  password: 'your-password',
  port: 5432,
});

app.post('/save-user', async (req, res) => {
    const { vorname, nachname } = req.body;

    try {
        const result = await pool.query(
            'UPDATE users SET data = $1 WHERE vorname = $2 AND nachname = $3 RETURNING *',
            [req.body, vorname, nachname]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Benutzer nicht gefunden');
        }

        res.send('Benutzerdaten erfolgreich gespeichert');
    } catch (err) {
        console.error(err);
        res.status(500).send('Fehler beim Speichern der Benutzerdaten');
    }
});

// Route zum Speichern eines neuen Fahrzeugs
app.post('/add-vehicle', (req, res) => {
    const newVehicle = req.body;

    // Pfad zur fahrzeuge.json
    const vehiclesFilePath = path.join(__dirname, 'fahrzeuge.json');

    // Lese die aktuelle Fahrzeugdatei
    fs.readFile(vehiclesFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Fehler beim Laden der Fahrzeugdaten');
        }

        // Parse die Daten
        const vehicles = JSON.parse(data);

        // Füge das neue Fahrzeug zur Liste hinzu
        vehicles.push(newVehicle);

        // Schreibe die aktualisierten Daten in die JSON-Datei
        fs.writeFile(vehiclesFilePath, JSON.stringify(vehicles, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).send('Fehler beim Speichern des Fahrzeugs');
            }
            res.status(200).send('Fahrzeug erfolgreich hinzugefügt!');
        });
    });
});

// Starten des Servers
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
