const express = require("express");
const mongoose = require("mongoose");
const twilio = require("twilio")(
  process.env.TWILIO_APP_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const qr = require("qr-image");
const fs = require("fs");
const multer = require("multer");
const routesConstants = require("../constants/Routes");

const storageUnit = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "uploads");
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString() + "_" + req.body.name + ".jpg");
  }
});

const upload = multer({
  storage: storageUnit
});

const router = express.Router();

const Shop = require("../models/shop");

router.get("/", (req, res, next) => {
  Shop.find({})
    .exec()
    .then(response => {
      res.status(200).json({
        success: true,
        message: response
      });
    })
    .catch(error => {
      res.status(500).json({
        success: true,
        message: error.message
      });
    });
});

router.post("/", upload.single("shopImage"), (req, res, next) => {
  const {
    name,
    phone_number,
    address,
    rating,
    isVerified,
    longitude,
    latitude
  } = req.body;
  const shop = new Shop({
    _id: new mongoose.Types.ObjectId(),
    name,
    phone_number,
    address,
    rating,
    isVerified,
    longitude,
    latitude,
    shopImage: req.file.path
  });
  shop
    .save()
    .then(response => {
      const message =
        "Our marketing guy visited your shop please visit the below provided link and show him the QR so he can verify.\n\n";
      const url = routesConstants.base_url + "shops/qr/" + response._id;
      twilio.messages
        .create({
          body: message + url,
          from: "+12396036783",
          to: phone_number
        })
        .then(message => {
          res.status(200).json({
            success: true,
            message:
              "Shop created successfuly, we have sent a URL to shop owner's phone. Please visit that link to scan the QR Code.",
            shop: response
          });
        })
        .catch(error => {
          res.status(500).json({
            success: false,
            message: error
          });
        });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
});

router.get("/:id", (req, res, next) => {
  const id = req.params.id;
  Shop.findById(id)
    .exec()
    .then(response => {
      res.status(200).json({
        success: true,
        message: response
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
});

router.get("/qr/:id", (req, res, next) => {
  let id = req.params.id;
  Shop.findById(id)
    .exec()
    .then(response => {
      var qr_png = qr.imageSync(id, { type: "svg" });
      let qr_code_file_name = id + ".svg";
      fs.writeFileSync(
        "src/routes/QRCodes/" + qr_code_file_name,
        qr_png,
        err => {
          if (err) {
            res.status(500).json({
              success: false,
              message: err
            });
          }
        }
      );
      res.sendFile(__dirname + "/QRCodes/" + qr_code_file_name);
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
});

router.patch("/:id", (req, res, next) => {
  const id = req.params.id;
  const updateOperation = {};
  for (const shopOps of req.body) {
    updateOperation[shopOps.propName] = shopOps.value;
  }
  Shop.update({ _id: id }, { $set: updateOperation })
    .exec()
    .then(response => {
      res.status(200).json({
        success: true,
        message: response
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
});

router.post("/verify", (req, res, next) => {
  const id = req.body.shopID;
  const verify = req.body.isVerified;
  Shop.update({ _id: id }, { $set: { isVerified: verify } })
    .exec()
    .then(response => {
      res.status(200).json({
        success: true,
        message: response
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
});

router.post("/upload", upload.single("shopImage"), (req, res, next) => {
  res.status(200).json({
    success: true,
    message: "Uploaded image succesfully"
  });
});

router.delete("/:id", (req, res, next) => {
  const id = req.params.id;
  Shop.remove({ _id: id })
    .exec()
    .then(response => {
      res.status(200).json({
        success: true,
        message: "Successfully deleted a shop"
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error.message
      });
    });
});

router.post("/send_message", (req, res, next) => {
  const phone_number = req.body.phone_number;
  twilio.messages
    .create({
      body: "Hi this is a test message",
      from: "+12396036783",
      to: phone_number
    })
    .then(message => {
      console.log(message);
      res.status(200).json({
        success: true,
        message: message
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: error
      });
    });
});

module.exports = router;
