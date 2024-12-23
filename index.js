const fs = require('fs');
const express = require('express');
const app = express();
const PORT = 3300;
const path = require('path');

app.use(express.json());

const usersFile = path.join(__dirname, 'user.json');
const vehiclesFilePath = path.join(__dirname, 'fahrzeuge.json');




app.get('/users', (req, res) => {
    fs.readFile(usersFile, 'utf-8', (err, data) => {
        if (err) return res.status(500).send('Fehler beim Laden der Benutzerdaten');
        res.json(JSON.parse(data));
    });
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


app.post('/add-vehicle', (req, res) => {
    const newVehicle = req.body;

   
    const vehiclesFilePath = path.join(__dirname, 'fahrzeuge.json');

    
    fs.readFile(vehiclesFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Fehler beim Laden der Fahrzeugdaten');
        }

     
        const vehicles = JSON.parse(data);

       
        vehicles.push(newVehicle);

     
        fs.writeFile(vehiclesFilePath, JSON.stringify(vehicles, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).send('Fehler beim Speichern des Fahrzeugs');
            }
            res.status(200).send('Fahrzeug erfolgreich hinzugefügt!');
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
