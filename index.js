const fs = require('fs');
const express = require('express');
const app = express();
const PORT = 3300;
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Datei Pfad für die JSON-Daten
const usersFile = path.join(__dirname, 'public', 'user.json');

// Benutzerdaten laden
app.get('/users', (req, res) => {
    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        res.json(JSON.parse(data));
    });
});

// Änderungen an Benutzerdaten speichern
app.post('/save-user', (req, res) => {
    const updatedUser = req.body;
    
    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        
        let users = JSON.parse(data);
        const userIndex = users.findIndex(u => u.vorname === updatedUser.vorname && u.nachname === updatedUser.nachname);
        
        if (userIndex !== -1) {
            users[userIndex] = updatedUser;
            fs.writeFile(usersFile, JSON.stringify(users, null, 2), err => {
                if (err) return res.status(500).send('Fehler beim Speichern der Benutzerdaten');
                res.send('Benutzerdaten erfolgreich gespeichert');
            });
        } else {
            res.status(404).send('Benutzer nicht gefunden');
        }
    });
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
    console.log(Server is running on http://localhost:${PORT});
});
