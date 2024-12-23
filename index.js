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
