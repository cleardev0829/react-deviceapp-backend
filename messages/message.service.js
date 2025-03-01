﻿const db = require("../_helpers/db");
const Message = db.Message;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

module.exports = {
  getAll,
  getByDeviceId,
  getById,
  getByPagenation,
  getLastMsgs,
  create,
  createA,
  update,
  delete: _delete,
  deleteByIds: deleteByIds,
};

const Event = mongoose.model(
  "Event",
  new Schema(
    { message: {}, index: String },
    { strict: false, collection: "events" }
  )
);

async function getAll() {
  return await Message.find();
}

async function getByDeviceId(messageParam) {
  return Message.find({ "message.ID": messageParam.deviceId });
}

async function getByPagenation(messageParam) {
  let con = {};

  if (messageParam.log) {
    if (messageParam.log === "all") {
      con = {
        "message.log": { $in: ["error", "info", "alarm"] },
      };
    } else {
      con = {
        "message.log": messageParam.log,
      };
    }
  }

  if (messageParam.deviceId) {
    con = {
      ...con,
      "message.ID": parseInt(messageParam.deviceId),
    };
  }

  const count = await Message.find({ ...con }).countDocuments();
  const tripsData = await Message.aggregate([
    {
      $match: {
        ...con,
      },
    },
    {
      $group: {
        _id: { ID: "$message.ID" },
        maxTrips: { $max: "$message.trips" },
        maxTripsWithoutErrors: { $max: "$message.tripsWithoutErrors" },
        maxOperatingHours: { $max: "$message.operating hours" },
      },
    },
  ]);

  return await Message.aggregate([
    {
      $match: {
        ...con,
      },
    },
    { $addFields: { count: count, ...tripsData } },
  ])
    .sort({ _id: -1 })
    .skip(parseInt(messageParam.skip))
    .limit(parseInt(messageParam.limit));
}

async function getLastMsgs(messageParam) {
  let aggregate = [
    {
      $match: {
        "message.log": messageParam.log,
      },
    },
    {
      $group: {
        _id: { ID: "$message.ID" },
        id: { $last: "$_id" },
        lift: { $last: "$lift" },
        device: { $last: "$device" },
        message: { $last: "$message" },
        timestamp: { $max: "$timestamp" },
      },
    },
  ];

  return await Message.aggregate([...aggregate])
    .sort({ _id: -1 })
    .skip(parseInt(messageParam.skip))
    .limit(parseInt(messageParam.limit));
}

async function getById(id) {
  return await Message.findById(id);
}

async function create(messageParam) {
  const message = new Message(messageParam);

  // save message
  await message.save();
}

async function createA(messageParam) {
  var message = new Event(messageParam);

  Object.keys(message).forEach((k) => {
    message.markModified(k);
  });

  // save message
  await message.save();
}

async function update(id, messageParam) {
  const message = await Message.findById(id);

  // validate
  if (!message) throw "Message not found";

  // copy messageParam properties to message
  Object.assign(message, messageParam);

  await message.save();
}

async function _delete(id) {
  if (id === "all") await Message.remove();
  else await Message.findByIdAndRemove(id);
}

async function deleteByIds(messageIds) {
  messageIds.map(async (id) => {
    await Message.findByIdAndRemove(id);
  });
}
