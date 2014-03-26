# tiny util
wait = (time) ->
  return $.Deferred (defer) ->
    setTimeout ->
      defer.resolve()
    , time

# ============================================================
# common

describe 'common', ->

  it 'should export namespace to global', ->
    (expect $.DeferredPipelineNs).to.be.a 'object'

  describe 'utils', ->
    
    describe 'isPromise', ->
    
      it 'should return true if passed fn returns deferred', ->
        fn = ->
          return $.Deferred().promise()
        res = $.DeferredPipelineNs.util.isPromise fn()
        (expect res).to.be true

      it 'should return false unless passed fn returns deferred', ->
        fn = ->
        res = $.DeferredPipelineNs.util.isPromise fn()
        (expect res).to.be false
      
# ============================================================
# Pipeline

describe 'ns.Pipeline', ->
  
  describe 'base stuff', ->

    it 'should create instance', ->
      instance = new $.DeferredPipelineNs.Pipeline
      (expect instance).to.be.an 'object'

    it 'should destroy instance', ->
      instance = new $.DeferredPipelineNs.Pipeline
      instance.destroy()
      (expect instance._items?).to.be false

  describe 'basic methods', ->
    
    it 'should add functions', ->
      pipeline = new $.DeferredPipelineNs.Pipeline
      pipeline.add $.noop,
        done: $.noop
        fail: $.noop
      pipeline.add $.noop
      pipeline.add $.noop,
        done: $.noop
        fail: $.noop

    it 'should has size', ->
      pipeline = new $.DeferredPipelineNs.Pipeline
      pipeline.add $.noop,
        done: $.noop
        fail: $.noop
      pipeline.add $.noop
      pipeline.add $.noop,
        done: $.noop
        fail: $.noop
      (expect pipeline.size()).to.be 3

  describe 'basic behaviors', ->

    it 'runs registered function', (done) ->

      spy1 = sinon.spy()

      fn1 = ->
        d = $.Deferred()
        (wait 10).done ->
          d.resolve()
          spy1()
          done()
        return d.promise()

      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1
      pipeline.run()

    it 'should fail unless registered function returns deferred', (done) ->

      failSpy = sinon.spy()

      fn1 = ->

      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1
      pipeline.on 'itemFail', (error) ->
        failSpy()
      pipeline.on 'allComplete', ->
        (expect failSpy.called).to.be true
        done()
      pipeline.run()

    it 'runs `done` option callback', (done) ->

      spy_fn1 = sinon.spy()

      fn1 = ->
        d = $.Deferred()
        (wait 10).done ->
          spy_fn1()
          d.resolve('arg1', 'arg2')
        return d.promise()

      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1,
        done: (doneArgs) ->
          (expect spy_fn1.called).to.be true
          (expect doneArgs[0]).to.be 'arg1'
          (expect doneArgs[1]).to.be 'arg2'
          done()
      pipeline.run()

    it 'runs `fail` option callback', (done) ->

      spy_fn1 = sinon.spy()

      fn1 = ->
        d = $.Deferred()
        (wait 10).done ->
          spy_fn1()
          d.reject('arg1', 'arg2')
        return d.promise()

      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1,
        fail: (failArgs, data) ->
          (expect spy_fn1.called).to.be true
          (expect data.aborted).to.be false
          (expect failArgs[0]).to.be 'arg1'
          (expect failArgs[1]).to.be 'arg2'
          done()
      pipeline.run()

    it 'receives aborted status about `fail` option callback', (done) ->

      spy_fn1 = sinon.spy()
      spy_fail = sinon.spy()

      fn1 = (stats) ->
        d = $.Deferred()
        (wait 40).done ->
          spy_fn1()
          (expect stats.aborted).to.be true
          d.resolve()
        return d.promise()

      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1,
        fail: (failArgs, data) ->
          spy_fail()
          (expect data.aborted).to.be true
      pipeline.run()

      (wait 10).done ->
        pipeline.stopAll()
      (wait 80).done ->
        #console.log 'spy_fn1 called?', spy_fn1.called
        #console.log 'spy_fail called?', spy_fail.called
        #console.log 'spy_fn1 calledOnce?', spy_fn1.calledOnce
        #console.log 'spy_fail calledOnce?', spy_fail.calledOnce
        (expect spy_fn1.calledOnce).to.be true
        (expect spy_fail.calledOnce).to.be true
        done()

  describe 'pipeSize patterns', ->

    randomNum = -> Math.floor(Math.random() * 10)

    createWaitFn = (done) ->
      return ->
        d = $.Deferred()
        (wait randomNum()).done ->
          d.resolve()
          done()
        return d.promise()

    addWaitFns = (count, pipeline, spy) ->
      for num in [1..count]
        fn = createWaitFn -> spy()
        pipeline.add fn

    for pipeSize in [1..5]
      for itemsCount in [1..6]
        do (pipeSize = pipeSize, itemsCount = itemsCount) ->
          it "should complete chaining when pipeSize is #{pipeSize} and items' count is #{itemsCount}", (done) ->
            spy = sinon.spy()
            options =
              pipeSize: pipeSize
            pipeline = new $.DeferredPipelineNs.Pipeline options
            addWaitFns itemsCount, pipeline, spy
            pipeline.on 'itemComplete', ->
              count = pipeline.getCurrentRunningItemsCount()
              (expect count <= pipeSize).to.be true
            pipeline.on 'allComplete', ->
              (expect spy.callCount).to.be itemsCount
              done()
            pipeline.run()

  describe 'order test', ->

    preparePipeLine = (testDone) ->

      fn1_called = sinon.spy()
      fn2_called = sinon.spy()
      fn3_called = sinon.spy()
      fn1_done = sinon.spy()
      fn2_done = sinon.spy()
      fn3_done = sinon.spy()

      fn1 = ->
        d = $.Deferred()
        fn1_called()
        (wait 10).done ->
          fn1_done()
          (expect fn1_called.calledOnce).to.be true
          (expect fn2_called.calledOnce).to.be false
          (expect fn3_called.calledOnce).to.be false
          (expect fn1_done.calledOnce).to.be true
          (expect fn2_done.called).to.be false
          (expect fn3_done.called).to.be false
          d.resolve()
        return d.promise()
          
      fn2 = ->
        d = $.Deferred()
        fn2_called()
        (wait 10).done ->
          fn2_done()
          (expect fn1_called.calledOnce).to.be true
          (expect fn2_called.calledOnce).to.be true
          (expect fn3_called.calledOnce).to.be false
          (expect fn1_done.calledOnce).to.be true
          (expect fn2_done.calledOnce).to.be true
          (expect fn3_done.called).to.be false
          d.resolve()
        return d.promise()
          
      fn3 = ->
        d = $.Deferred()
        fn3_called()
        (wait 10).done ->
          fn3_done()
          (expect fn1_called.calledOnce).to.be true
          (expect fn2_called.calledOnce).to.be true
          (expect fn3_called.calledOnce).to.be true
          (expect fn1_done.calledOnce).to.be true
          (expect fn2_done.calledOnce).to.be true
          (expect fn3_done.calledOnce).to.be true
          d.resolve()
        return d.promise()
          
      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1
      pipeline.add fn2
      pipeline.add fn3
      pipeline.add ->
        testDone()
        d = $.Deferred()
        d.resolve()
        return d.promise()

      return pipeline

    it 'should run regsitered functions sequentially', (done) ->
      
      pipeline = preparePipeLine done
      pipeline.run()

    it 'should avoid secound run while running', (done) ->
      
      pipeline = preparePipeLine done
      pipeline.run()
      pipeline.run()
      pipeline.run()
      pipeline.run()

    it 'should accept secound run after the end of the first run', (done) ->

      fn1_called = sinon.spy()
      fn2_called = sinon.spy()
      fn3_called = sinon.spy()
      fn1_done = sinon.spy()
      fn2_done = sinon.spy()
      fn3_done = sinon.spy()

      fn1 = ->
        d = $.Deferred()
        fn1_called()
        (wait 10).done ->
          fn1_done()
          (expect fn1_called.calledOnce).to.be true
          (expect fn2_called.calledOnce).to.be false
          (expect fn3_called.calledOnce).to.be false
          (expect fn1_done.calledOnce).to.be true
          (expect fn2_done.called).to.be false
          (expect fn3_done.called).to.be false
          d.resolve()
        return d.promise()
          
      fn2 = ->
        d = $.Deferred()
        fn2_called()
        (wait 10).done ->
          fn2_done()
          (expect fn1_called.calledOnce).to.be true
          (expect fn2_called.calledOnce).to.be true
          (expect fn3_called.calledOnce).to.be false
          (expect fn1_done.calledOnce).to.be true
          (expect fn2_done.calledOnce).to.be true
          (expect fn3_done.called).to.be false
          d.resolve()
        return d.promise()
          
      fn3 = ->
        d = $.Deferred()
        fn3_called()
        (wait 10).done ->
          fn3_done()
          (expect fn1_called.calledOnce).to.be true
          (expect fn2_called.calledOnce).to.be true
          (expect fn3_called.calledOnce).to.be true
          (expect fn1_done.calledOnce).to.be true
          (expect fn2_done.calledOnce).to.be true
          (expect fn3_done.calledOnce).to.be true
          d.resolve()
        return d.promise()
          
      pipeline = new $.DeferredPipelineNs.Pipeline
        pipeSize: 1
      pipeline.add fn1
      pipeline.add fn2
      secoundRun = ->
        pipeline.once 'allComplete', done
        pipeline.add fn3
        pipeline.run()
      pipeline.once 'allComplete', secoundRun
      pipeline.run()
      
  # start stop tests
  do ->

    randomNum = -> Math.floor(Math.random() * 10)

    createWaitFn = ->
      return ->
        d = $.Deferred()
        (wait randomNum()).done ->
          d.resolve()
        return d.promise()

    addWaitFns = (count, pipeline) ->
      for num in [1..count]
        fn = createWaitFn()
        pipeline.add fn
  
    describe 'stopAll method', ->
      
      it 'stop all runnning items', (done) ->
        
        spy_success = sinon.spy()
        spy_fail = sinon.spy()
        spy_complete = sinon.spy()

        options = pipeSize: 3
        pipeline = new $.DeferredPipelineNs.Pipeline options

        addWaitFns 20, pipeline

        pipeline.on 'itemComplete', ->
          spy_complete()
          count = pipeline.completeCount
          if count is 10
            pipeline.stopAll()

        pipeline.on 'itemSuccess', ->
          spy_success()

        pipeline.on 'itemFail', ->
          spy_fail()

        pipeline.on 'allComplete', ->
          # console.log spy_success.callCount
          # console.log spy_fail.callCount
          # console.log spy_complete.callCount
          (expect spy_success.callCount).to.be 10
          (expect spy_fail.callCount).to.be 10
          (expect spy_complete.callCount).to.be 20
          done()

        pipeline.run()

      it 'fires `fail` event only once', (done) ->
        
        spy_fail = sinon.spy()

        options = pipeSize: 3
        pipeline = new $.DeferredPipelineNs.Pipeline options

        addWaitFns 10, pipeline

        pipeline.once 'itemSuccess', ->
          pipeline.stopAll()
          pipeline.stopAll()
          pipeline.stopAll()
          (wait 10).done ->
            (expect spy_fail.callCount).to.be 9
            done()
        pipeline.on 'itemFail', ->
          spy_fail()
        pipeline.run()

    describe 'stopAllWithoutTheLast method', ->

      it 'stops all without the last one', (done) ->

        spy_theLastOne = sinon.spy()
        spy_success = sinon.spy()
        spy_fail = sinon.spy()
        spy_complete = sinon.spy()

        options =
          pipeSize: 3
        pipeline = new $.DeferredPipelineNs.Pipeline options

        addWaitFns 20, pipeline

        pipeline.add ->
          d = $.Deferred()
          (wait 10).done ->
            #console.log 'final one'
            spy_theLastOne()
            d.resolve()
          return d.promise()

        pipeline.on 'itemComplete', ->
          spy_complete()
          count = pipeline.completeCount
          if count is 10
            pipeline.stopAllWithoutTheLast()

        pipeline.on 'itemSuccess', ->
          spy_success()

        pipeline.on 'itemFail', ->
          spy_fail()

        pipeline.on 'allComplete', ->
          #console.log 'allComplete!'
          #console.log spy_success.callCount
          #console.log spy_fail.callCount
          #console.log spy_complete.callCount
          #console.log 'spy_theLastOne called?', spy_theLastOne.called
          (expect spy_theLastOne.calledOnce).to.be true
          (expect spy_success.callCount).to.be 11
          (expect spy_fail.callCount).to.be 10
          (expect spy_complete.callCount).to.be 21
          done()

        pipeline.run()

    describe 'run-top-run test', ->
      
      it 'runs the pipe when `run` was called after `stop`', (done) ->

        spy_success = sinon.spy()
        spy_fail = sinon.spy()
        spy_complete = sinon.spy()
        
        options = pipeSize: 3
        pipeline = new $.DeferredPipelineNs.Pipeline options

        onItemSuccess = -> spy_success()
        onItemFail = -> spy_fail()

        firstRun = ->

          addWaitFns 20, pipeline

          onItemComplete = ->
            spy_complete()
            count = pipeline.completeCount
            if count is 10
              pipeline.stopAll()

          onAllComplete = ->
            # console.log spy_success.callCount
            # console.log spy_fail.callCount
            # console.log spy_complete.callCount
            (expect spy_success.callCount).to.be 10
            (expect spy_fail.callCount).to.be 10
            (expect spy_complete.callCount).to.be 20
            pipeline.off 'itemComplete', onItemComplete
            secondRun()

          pipeline.on 'itemComplete', onItemComplete
          pipeline.on 'itemSuccess', onItemSuccess
          pipeline.on 'itemFail', onItemFail
          pipeline.once 'allComplete', onAllComplete
          pipeline.run()

        secondRun = ->

          addWaitFns 20, pipeline

          onItemComplete = ->
            spy_complete()
            count = pipeline.completeCount
            if count is 30
              pipeline.stopAll()

          onAllComplete = ->
            # console.log spy_success.callCount
            # console.log spy_fail.callCount
            # console.log spy_complete.callCount
            (expect spy_success.callCount).to.be 20
            (expect spy_fail.callCount).to.be 20
            (expect spy_complete.callCount).to.be 40
            pipeline.destroy()
            done()

          pipeline.on 'itemComplete', onItemComplete
          pipeline.once 'allComplete', onAllComplete
          pipeline.run()

        firstRun()

    describe 'run-top-run-stop-run test', ->
      
      it 'runs the pipe when `run` was called after `stop`', (done) ->

        spy_success = sinon.spy()
        spy_fail = sinon.spy()
        spy_complete = sinon.spy()
        
        options = pipeSize: 3
        pipeline = new $.DeferredPipelineNs.Pipeline options

        onItemSuccess = -> spy_success()
        onItemFail = -> spy_fail()

        firstRun = ->

          addWaitFns 20, pipeline

          onItemComplete = ->
            spy_complete()
            count = pipeline.completeCount
            if count is 10
              pipeline.stopAll()

          onAllComplete = ->
            # console.log spy_success.callCount
            # console.log spy_fail.callCount
            # console.log spy_complete.callCount
            (expect spy_success.callCount).to.be 10
            (expect spy_fail.callCount).to.be 10
            (expect spy_complete.callCount).to.be 20
            pipeline.off 'itemComplete', onItemComplete
            secondRun()

          pipeline.on 'itemComplete', onItemComplete
          pipeline.on 'itemSuccess', onItemSuccess
          pipeline.on 'itemFail', onItemFail
          pipeline.once 'allComplete', onAllComplete
          pipeline.run()

        secondRun = ->

          addWaitFns 20, pipeline

          onItemComplete = ->
            spy_complete()
            count = pipeline.completeCount
            if count is 30
              pipeline.stopAll()

          onAllComplete = ->
            # console.log spy_success.callCount
            # console.log spy_fail.callCount
            # console.log spy_complete.callCount
            (expect spy_success.callCount).to.be 20
            (expect spy_fail.callCount).to.be 20
            (expect spy_complete.callCount).to.be 40
            thirdRun()

          pipeline.on 'itemComplete', onItemComplete
          pipeline.once 'allComplete', onAllComplete
          pipeline.run()

        thirdRun = ->

          addWaitFns 20, pipeline

          onItemComplete = -> spy_complete()

          onAllComplete = ->
            # console.log spy_success.callCount
            # console.log spy_fail.callCount
            # console.log spy_complete.callCount
            (expect spy_success.callCount).to.be 40
            (expect spy_fail.callCount).to.be 20
            (expect spy_complete.callCount).to.be 80
            pipeline.destroy()
            done()

          pipeline.on 'itemComplete', onItemComplete
          pipeline.once 'allComplete', onAllComplete
          pipeline.run()

        firstRun()

  # end stop tests
