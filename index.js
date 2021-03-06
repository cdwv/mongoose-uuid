'use strict';

var mongoose = require('mongoose');
var bson = require('bson');
var util = require('util');
var uuid = require('node-uuid');

var Document = mongoose.Document;

function SchemaUUID(path, options) {
    mongoose.SchemaTypes.Buffer.call(this, path, options);
}

util.inherits(SchemaUUID, mongoose.SchemaTypes.Buffer);


SchemaUUID.schemaName = 'UUID';

SchemaUUID.decodeUUID = (binary) => {

    const len = binary.length();
    const b = binary.read(0, len);

    let buf = new Buffer(len);

    for (let i = 0; i < len; i++) {
        buf[i] = b[i];
    }


    let hex = '';

    for (let i = 0; i < len; i++) {

        const n = buf.readUInt8(i);
        if (n < 16)
            hex += '0' + n.toString(16);
        else
            hex += n.toString(16);
    }

    return hex.substr(0, 8) + '-' + hex.substr(8, 4) + '-' + hex.substr(12, 4) + '-' + hex.substr(16, 4) + '-' + hex.substr(20, 12);
};

SchemaUUID.prototype.checkRequired = function (value) {
    return value instanceof mongoose.Types.Buffer.Binary;
};

SchemaUUID.prototype.cast = function (value, doc, init) {
    if (mongoose.SchemaType._isRef(this, value, doc, init)) {
        // wait! we may need to cast this to a document

        if (value === null || value === undefined) {
            return value;
        }

        if (value instanceof Document) {
            value.$__.wasPopulated = true;
            return value;
        }

        // setting a populated path
        if (value instanceof mongoose.Types.Buffer.Binary) {
            return value;
        } else if (typeof value === 'string') {
            var uuidBuffer = new mongoose.Types.Buffer(uuid.parse(value));
            uuidBuffer.subtype(bson.Binary.SUBTYPE_UUID);
            return uuidBuffer.toObject();
        } else if (Buffer.isBuffer(value) || !util.isObject(value)) {
            throw new CastError('UUID', value, this.path);
        }

        // Handle the case where user directly sets a populated
        // path to a plain object; cast to the Model used in
        // the population query.
        const path = doc.$__fullPath(this.path);
        const owner = doc.ownerDocument ? doc.ownerDocument() : doc;
        const pop = owner.populated(path, true);
        let ret = value;
        if (!doc.$__.populated ||
            !doc.$__.populated[path] ||
            !doc.$__.populated[path].options ||
            !doc.$__.populated[path].options.options ||
            !doc.$__.populated[path].options.options.lean) {
            ret = new pop.options.model(value);
            ret.$__.wasPopulated = true;
        }

        return ret;
    }

    if (value === null || value === undefined) {
        return value;
    }

    if (value instanceof mongoose.Types.Buffer.Binary)
        return value;


    if (value._id) {
        if (value._id instanceof mongoose.Types.Buffer.Binary) {
            return value._id;
        }
        if (typeof value._id === 'string') {
            let uuidBuffer = new mongoose.Types.Buffer(uuid.parse(value._id));
            uuidBuffer.subtype(bson.Binary.SUBTYPE_UUID);
            return uuidBuffer.toObject();
        }
    }

    if (typeof value === 'string') {
        let uuidBuffer = new mongoose.Types.Buffer(uuid.parse(value));
        uuidBuffer.subtype(bson.Binary.SUBTYPE_UUID);
        return uuidBuffer.toObject();
    }

    throw new Error('Could not cast ' + value + ' to uuid.');
};

SchemaUUID.prototype.castForQuery = function ($conditional, val) {
    var handler;
    if (arguments.length === 2) {
        handler = this.$conditionalHandlers[$conditional];
        if (!handler)
            throw new Error("Can't use " + $conditional + " with Buffer.");
        return handler.call(this, val);
    } else {
        val = $conditional;
        return this.cast(val);
    }
};


module.exports = (mongoose) => {
    mongoose.Types.UUID = mongoose.SchemaTypes.UUID = SchemaUUID;
};
