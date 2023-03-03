const jwt = require("jsonwebtoken");

//extraction du token de l'entête de la requête + vérification du token
//extraction de l'id utilisateur à partir du token pour utilisation par les routes
module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, `${process.env.JWT_SECRET_TOKEN}`);
    const userId = decodedToken.userId;
    req.auth = {
      userId: userId,
    };
    next();
  } catch (error) {
    res.status(401).json({ error });
  }
};
