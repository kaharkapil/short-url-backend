const express = require("express");
const app = express();
const mongoose = require('mongoose')
global.config = require('./config/config')

const bodyParser = require('body-parser')
const cors = require("cors");


const jwt = require('jsonwebtoken')

const URLModel = require("./models/url");

const shortId = require('shortid')


const bytesToKey = require('evp_bytestokey');
const crypto = require('crypto');
const encryptionToken = bytesToKey("password@123", null, 256, 16);


const { API_PORT } = process.env;

app.listen(3000, () => {
    console.log('Server started at port : ' + 3000)
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions))

let dbURL = `mongodb://${global.config.database.unm}:${encodeURIComponent(global.config.database.pass)}@${global.config.database.host}:${global.config.database.port}/${global.config.database.name}`;

mongoose.connect(dbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(r => {
    console.log('database connected!')
}).catch(e => {
    console.log('error while connecting database: ', e);
});


app.post("/generate", async (req, res) => {
    try {

        if (!req.body.url) {
            res.status(400).send("Please enter valid URL");
        }
        const { url } = req.body;

        const cipher = crypto.createCipheriv('aes-256-cbc-hmac-sha1', encryptionToken.key, encryptionToken.iv);

        let encrypted_url;

        encrypted_url = cipher.update(JSON.stringify(url), 'utf8', 'hex') + cipher.final('hex')

        const previousURL = await URLModel.findOne({ enc_url: encrypted_url });

        if (previousURL) {

            await jwt.verify(previousURL.token, global.config.jwt.key, (err, data) => {
                if (data) {
                    console.log("decoded data", data);
                    var exp = data.exp * 1000;
                    console.log(new Date(exp));
                    var seconds =Math.floor(Math.abs(new Date(exp) - new Date())/1000) 
                    return res.status(200).send({ url: 'http://localhost:3000/' + previousURL.shortCode, expiresIn: seconds + " seconds" });
                } else {
                    URLModel.deleteOne({ enc_url: encrypted_url }).then(function () {
                        return res.status(200).send({ url: '', expiresIn: "Expired" });
                    }).catch(function (error) {
                        console.log(error);
                    });
                }
            })
        } else {
            let expiryTime = 120;
            let token = jwt.sign(
                { url: url },
                global.config.jwt.key,
                {
                    expiresIn: expiryTime,
                }
            );

            let randomId = shortId.generate();

            let newURL = await URLModel.create({
                enc_url: encrypted_url,
                shortCode: randomId,
                token: token
            });
            return res.status(200).json({ url: 'http://localhost:3000/' + randomId, expiresIn: expiryTime + " seconds" });
        }




    } catch (err) {
        console.log(err);
    }
});

app.get("/:subcode", async (req, res) => {
    try {
        console.log(req.params);

        const urlData = await URLModel.findOne({ shortCode: req.params.subcode });

        if (urlData) {
            await jwt.verify(urlData.token, global.config.jwt.key, (err, data) => {
                if (data) {
                    console.log("decoded data", data);
                    return res.redirect(data.url);
                } else {
                    URLModel.deleteOne({ shortCode: req.params.subcode }).then(function () {
                        return res.status(500).send({ message: "URL Expired" });
                    }).catch(function (error) {
                        console.log(error);
                    });
                }
            })
        } else {
            return res.status(404).send({ message: "Invalid URL" })
        }

    } catch (err) {
        console.log("Error", err);
    }
});