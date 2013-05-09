
"use strict"

var moment = require('moment')
var streamChannel = require('quiver-stream-channel')

var pipeStreamWithThrottledSpeed = function(readStream, writeStream, bytesPerSecond, callback) {
  callback = callback || function() { }

  var currentBytesPerSecond = 0
  var lastUpdate = moment()

  var doPipe = function() {
    writeStream.prepareWrite(function(streamClosed) {
      if(streamClosed) {
        readStream.closeRead(streamClosed.err)
        callback(streamClosed.err)
        return
      }

      readStream.read(function(streamClosed, data) {
        if(streamClosed) {
          writeStream.closeWrite(streamClosed.err)
          callback(streamClosed.err)
          return
        }

        writeStream.write(data)

        var bufferSize = data.length
        var now = moment()
        var timeElapsed = now.diff(lastUpdate)

        if(timeElapsed > 1000) {
          currentBytesPerSecond = bufferSize
          lastUpdate = now
          doPipe()
        } else {
          currentBytesPerSecond += bufferSize
          if(currentBytesPerSecond >= bytesPerSecond) {
            setTimeout(function() {
              currentBytesPerSecond = 0
              lastUpdate = moment()
              doPipe()
            }, 1000)
          } else { 
            doPipe()
          }
        }
      })
    })
  }
  doPipe()
}

var createThrottledReadStream = function(readStream, bytesPerSecond) {
  var throttledReadStream = Object.create(readStream)

  var currentBytesPerSecond = 0
  var lastUpdate = moment()

  var doRead = function(callback) {
    readStream.read(function(streamClosed, data) {
      if(streamClosed) return callback(streamClosed)

      if(moment().diff(lastUpdate) > 1000) {
        lastUpdate = moment()
        currentBytesPerSecond = data.length
      } else {
        currentBytesPerSecond += data.length
      }

      callback(null, data)
    })
  }

  throttledReadStream.read = function(callback) {
    if(currentBytesPerSecond < bytesPerSecond || moment().diff(lastUpdate) > 1000) {
      doRead(callback)
    } else {
      setTimeout(function() {
        doRead(callback)
      }, 1000)
    }
  }

  return throttledReadStream
}

var createThrottledWriteStream = function(writeStream, bytesPerSecond) {
  var throttledWriteStream = Object.create(writeStream)

  var currentBytesPerSecond = 0
  var lastUpdate = moment()

  var doWrite = function(data) {
    if(moment().diff(lastUpdate) < 1000) {
      currentBytesPerSecond += data.length
    } else {
      lastUpdate = moment()
      currentBytesPerSecond = data.length
    }

    writeStream.write(data)
  }

  var writer = function(streamClosed, data) {
    if(streamClosed) {
      writeStream.closeWrite(streamClosed.err)
    } else {
      doWrite(data)
    }
  }

  var doPrepareWrite = function(callback) {
    writeStream.prepareWrite(function(streamClosed) {
      if(streamClosed) return callback(streamClosed)

      callback(null, writer)
    })
  }

  throttledWriteStream.prepareWrite = function(callback) {
    if(currentBytesPerSecond < bytesPerSecond || moment().diff(lastUpdate) > 1000) {
      doPrepareWrite(callback)
    } else {
      setTimeout(function() {
        doPrepareWrite(callback)
      }, 1000)
    }
  }

  throttledWriteStream.write = doWrite

  return throttledWriteStream
}

module.exports = {
  pipeStreamWithThrottledSpeed: pipeStreamWithThrottledSpeed,
  createThrottledReadStream: createThrottledReadStream,
  createThrottledWriteStream: createThrottledWriteStream
}