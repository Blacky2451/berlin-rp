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
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
            return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        }
        res.json(JSON.parse(data));
    });
});

// Änderungen an Benutzerdaten speichern
app.post('/save-user', (req, res) => {
    const updatedUser = req.body;

    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Benutzerdaten:', err);
            return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        }

        let users = JSON.parse(data);
        const userIndex = users.findIndex(u => u.vorname === updatedUser.vorname && u.nachname === updatedUser.nachname);

        if (userIndex !== -1) {
            users[userIndex] = updatedUser;

            fs.writeFile(usersFile, JSON.stringify(users, null, 2), (err) => {
                if (err) {
                    console.error('Fehler beim Speichern der Datei:', err);
                    return res.status(500).send('Fehler beim Speichern der Benutzerdaten');
                }
                res.send('Benutzerdaten erfolgreich gespeichert');
            });
        } else {
            res.status(404).send('Benutzer nicht gefunden');
        }
    });
});

// Starten des Servers
app.listen(PORT, () => {
    console.log(`Server läuft unter http://localhost:${PORT}`);
});

