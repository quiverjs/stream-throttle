
"use strict"

var should = require('should')
var moment = require('moment')
var streamConvert = require('quiver-stream-convert')
var streamChannel = require('quiver-stream-channel')
var streamThrottle = require('../lib/stream-throttle')
var pipeStream = require('quiver-pipe-stream').pipeStream

var bytesPerSecond = 1024

var buffers = []
for(var i=0; i<20; i++) {
  buffers.push(new Buffer(128))
}
var sourceStreamable = streamConvert.buffersToStreamable(buffers)

var assertSameBuffers = function(buffers1, buffers2) {
  buffers1.length.should.equal(buffers2.length)
  for(var i=0; i<buffers.length; i++) {
    buffers1[i].should.equal(buffers2[i])
  }
}

describe('throttled pipe stream test', function() {
  it('normal pipe stream should have maximum bandwidth', function(callback) {
    var sourceStream = sourceStreamable.toStream()
    var channel = streamChannel.createStreamChannel()

    var start = moment()

    pipeStream(sourceStream, channel.writeStream)

    streamConvert.streamToBuffers(channel.readStream, function(err, resultBuffers) {
      if(err) throw err

      console.log('normal stream read finished in', moment().diff(start), 'milliseconds')
      assertSameBuffers(buffers, resultBuffers)
      callback()
    })
  })

  it('throttled pipe stream should have throttled bandwidth', function(callback) {
    var sourceStream = sourceStreamable.toStream()
    var channel = streamChannel.createStreamChannel()
    var start = moment()

    streamThrottle.pipeStreamWithThrottledSpeed(sourceStream, channel.writeStream, bytesPerSecond)

    streamConvert.streamToBuffers(channel.readStream, function(err, resultBuffers) {
      if(err) throw err

      console.log('throttled stream read finished in', moment().diff(start), 'milliseconds')
      assertSameBuffers(buffers, resultBuffers)
      callback()
    })
  })
})

describe('throttled stream test', function() {
  it('test throttled read', function(callback) {
    var sourceStream = sourceStreamable.toStream()
    var throttledStream = streamThrottle.createThrottledReadStream(sourceStream, bytesPerSecond)
    var start = moment()

    streamConvert.streamToBuffers(throttledStream, function(err, resultBuffers) {
      if(err) throw err

      console.log('throttled stream read finished in', moment().diff(start), 'milliseconds')
      assertSameBuffers(buffers, resultBuffers)
      callback()
    })
  })

  it('test throttled write', function(callback) {
    var sourceStream = sourceStreamable.toStream()
    var channel = streamChannel.createStreamChannel()
    var start = moment()

    var writeStream = streamThrottle.createThrottledWriteStream(channel.writeStream, bytesPerSecond)
    pipeStream(sourceStream, writeStream)

    streamConvert.streamToBuffers(channel.readStream, function(err, resultBuffers) {
      if(err) throw err

      console.log('throttled stream write finished in', moment().diff(start), 'milliseconds')
      assertSameBuffers(buffers, resultBuffers)
      callback()
    })
  })
})