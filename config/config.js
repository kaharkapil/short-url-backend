module.exports = {
    "database": {
        name: 'shortURL',
        host: 'localhost',
        port: 27017,
        unm: 'admin',
        pass: 'admin'
    },
    "jwt": {
        "key": "short@url",
        "alg": "HS256",
        "exp": 300
    }
}