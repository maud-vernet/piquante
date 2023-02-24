const Sauce = require('../models/sauces');
const fs = require('fs');

exports.getAllSauces = (req, res, next) => {
    Sauce.find().then(
      (sauces) => {
        res.status(200).json(sauces);
      }
    ).catch(
      (error) => {
        res.status(400).json({
          error: error
        });
      }
    );
  };

exports.getOneSauce = (req, res, next) => {
  Sauce.findOne({
    _id: req.params.id
  }).then(
    (sauce) => {
      res.status(200).json(sauce);
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.createSauce = (req, res, next) => {
  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject._userId;
  const sauce = new Sauce({
      ...sauceObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  sauce.save()
  .then(() => { res.status(201).json({message: 'Sauce enregistrée !'})})
  .catch(error => { res.status(400).json( { error })})
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file ? {
    ...JSON.parse(req.body.sauce),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({_id: req.params.id})
      .then((sauce) => {
          if (sauce.userId !== req.auth.userId) {
              res.status(401).json({ message : 'Not authorized'});
          } else {
              Sauce.updateOne({ _id: req.params.id}, { ...sauceObject, _id: req.params.id})
              .then(() => res.status(200).json({message : 'Sauce modifiée !'}))
              .catch(error => res.status(401).json({ error }));
          }
      })
      .catch((error) => {
          res.status(400).json({ error });
      });
};

exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id})
      .then(sauce => {
          if (sauce.userId !== req.auth.userId) {
              res.status(401).json({message: 'Not authorized'});
          } else {
              const filename = sauce.imageUrl.split('/images/')[1];
              fs.unlink(`images/${filename}`, () => {
                  Sauce.deleteOne({_id: req.params.id})
                      .then(() => { res.status(200).json({message: 'Sauce supprimée !'})})
                      .catch(error => res.status(401).json({ error }));
              });
          }
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};

exports.likeSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id})
      .then(sauce => {
        //stockage de l'id de l'utilisateur et de son like/dislike  
        const userId = req.body.userId;
        const like = req.body.like;

        // le user like
        if (like === 1) {
          // si le user n'est pas déjà présent dans la liste des users ayant liké
          if (!sauce.usersLiked.includes(userId)) {
            // maj de la sauce
            Sauce.updateOne(
              { _id: req.params.id},
              { 
                // ajoute l'id de l'utilisateur au tableau des likes
                $push: { usersLiked: userId },
                //on ajoute un like au compteur
                $inc: { likes: +1 }
            })
            .then(() => res.status(200).json({message : 'Sauce likée !'}))
            .catch(error => res.status(401).json({ error }));
            // si le user a déjà liké cette sauce, on lui envoie un message
          } else if (sauce.usersLiked.includes(userId)){
            return res.status(401).json({ message: "Vous avez déjà aimé cette sauce." })
          }
        }
        // le user dislike 
        else if (like === -1) {
          // si le user n'est pas déjà présent dans la liste des users ayant disliké
          if (!sauce.usersDisliked.includes(userId)) {
            // maj de la sauce
            Sauce.updateOne(
              { _id: req.params.id},
              { 
                // ajoute l'id de l'utilisateur au tableau des likes
                $push: { usersdisliked: userId },
                //on ajoute un like au compteur
                $inc: { dislikes: +1 }
            })
            .then(() => res.status(200).json({message : 'Sauce dislikée !'}))
            .catch(error => res.status(401).json({ error }));
          } else if (sauce.usersdisliked.includes(userId)) {
            return res.status(401).json({ message: "Vous avez déjà disliké cette sauce." })
          }
        }
        // le user annule son like/dislike
          else if (req.body.like === 0) {
          // si le user a disliké précédemment
          if (sauce.usersDisliked.includes(userId)) {
            Sauce.updateOne(
                { _id: req.params.id },
                { 
                  //retrait se son user du tableau des usersDisliked  
                  $pull: { usersDisliked: userId },
                  // -1 sur les dislikes
                  $inc: { dislikes: -1 }
                }
            )
            .then(() => res.status(200).json({ message: "dislike retiré." }))
            .catch(error => res.status(400).json({ error }));
          }
          // si le user a liké prédemment
          else if (sauce.usersLiked.includes(userId)) {
            Sauce.updateOne(
              { _id: req.params.id },
              { 
                  $pull: { usersLiked: userId },
                  $inc: { likes: -1 }
              }
            )
            .then(() => res.status(200).json({ message: "Like retiré." }))
            .catch(error => res.status(400).json({ error }));
          }
        }
        else {
          res.status(400).json({ error : "valeur like incorrecte" });
        }  
      })
      .catch( error => {
          res.status(500).json({ error });
      });
};