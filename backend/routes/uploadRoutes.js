// routes/uploadRoutes.js

const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure how files are stored
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Function to check for allowed file types (images OR videos)
function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|mp4|mov|avi|wmv/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypes = /image\/jpeg|image\/png|video\/mp4|video\/quicktime|video\/x-ms-wmv|video\/x-msvideo/;
    const mimetype = mimetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type: Only images or videos are allowed.'));
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

// Use 'upload.any()' to accept a file from any field name
router.post('/', upload.any(), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.send({
        message: 'File Uploaded',
        path: `/${req.files[0].path.replace(/\\/g, "/")}` // Ensure path uses forward slashes
    });
});

module.exports = router;
