
var moment = require('moment')
var streamChannel = require('quiver-stream-channel')

var defaultGetBufferSize = function(buffer) {
  return buffer.length
}

var pipeStreamWithThrottledSpeed = function(readStream, writeStream, bytesPerSecond, options) {
  options = options || { }
  var getBufferSize = options.getBufferSize || defaultGetBufferSize

  var currentBytesPerSecond = 0
  var lastUpdate = moment()

  var doPipe = function() {
    writeStream.prepareWrite(function(streamClosed) {
      if(streamClosed) return readStream.closeRead(streamClosed.err)

      readStream.read(function(streamClosed, data) {
        if(streamClosed) return writeStream.closeWrite(streamClosed.err)

        writeStream.write(data)

        var bufferSize = getBufferSize(data)
        var now = moment()
        var timeElapsed = now.diff(lastUpdate)

        if(timeElapsed > 1000) {
          currentBytesPerSecond = bufferSize
          lastUpdate = now
          doPipe()
        } else {
          currentBytesPerSecond += bufferSize
          if(currentBytesPerSecond > bytesPerSecond) {
            setTimeout(doPipe, 1000)
          } else { 
            doPipe()
          }
        }
      })
    })
  }
  doPipe()
}

var createThrottledReadStream = function(readStream, bytesPerSecond, options) {

  var channel = streamChannel.createStreamChannel()
  var writeStream = channel.writeStream
  var throttledReadStream = channel.readStream

  pipeStreamWithThrottledSpeed(readStream, writeStream, bytesPerSecond, options)

  return throttledReadStream
}

var createThrottledWriteStream = function(writeStream, bytesPerSecond, options) {

  var channel = streamChannel.createStreamChannel()
  var throttledWriteStream = channel.writeStream
  var readStream = channel.readStream

  pipeStreamWithThrottledSpeed(readStream, writeStream, bytesPerSecond, options)

  return throttledWriteStream
}

var createMultiStreamThrottler = function(bytesPerSecond) {
  var currentTime = moment()
  var numberOfStreams = 0

  var updateTime = function() {
    currentTime = moment()
    if(numberOfStreams == 0) return

    setTimeout(updateTime, 1000)
  }

  return function(readStream) {
    numberOfStreams++
    updateTime()

    var channel = streamChannel.createStreamChannel()
    var writeStream = channel.writeStream
    var throttledReadStream = channel.readStream

    var doPipe = function() {
      
    }
    doPipe()

    return throttledReadStream
  }
}