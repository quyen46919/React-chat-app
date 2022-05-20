var express = require('express');
var router = express.Router();
const cloudinary = require('cloudinary').v2;

router.get('/cloudinary', async (req, res) => {
    res.send(req.body)
});

router.post('/cloudinary', async (req, res) => {
    console.log(req.body.images);

    if (!req.body.images) {
        console.log("không có ảnh")
        return res.status(400).json({
            error: 'Nothing to upload!'
        });
    }

    try {
        console.log("in try catch");
        let pictureFiles = req.body.images;

        //Check if files exist
        if (!pictureFiles)
            return res.status(400).json({ message: "No picture attached!" });

        let multiplePicturePromise = pictureFiles.map((picture) =>
            cloudinary.uploader.upload(picture)
        );

        let imageResponses = await Promise.all(multiplePicturePromise).catch(err => {
            console.log(err)
            console.log("ERRORS");
        });

        var responseImagesList = [];
        imageResponses.map((images) => responseImagesList.push(images.secure_url));
        
        return res.status(200).json({ images: responseImagesList });
        console.log("finished");
        
    } catch(err) {
        return res.status(500).json({
            message: err.message,
        });
    }
})


module.exports = router;