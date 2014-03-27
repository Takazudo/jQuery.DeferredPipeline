do ($ = jQuery) ->

  # from global
  EveEve = window.EveEve

  # define namespaces
  ns = {}
  ns.util = {}

  # ============================================================
  # tiny utils

  # wait
  # just a setTimeout wrapper

  wait = (time) ->
    return $.Deferred (defer) ->
      setTimeout ->
        defer.resolve()
      , time

  # ============================================================
  # const vals

  # messages

  ns.MESSAGE =
    error_no_deferred: 'Error: registered function should return a deferred'


  # ============================================================
  # utils

  # isPromise
  # check whether passed var is promise or not
  
  ns.util.isPromise = (obj) ->
    if obj? and obj.then? and obj.done?
      return true
    return false

  # ============================================================
  # Item
  # handles one loading process.

  class ns.Item extends EveEve

    # default option vars

    @defaults =
      done: null
      fail: null
      complete: null

    # Item needs to receive main function.
    #
    # * This passed function will be queued to the pipeline (ns.Pipeline).
    # * This function needs to return promise object.
    # * Pipeline knows the end of the async process by the promise's resolve stats.
    #
    # new ns.Item (stats) ->
    #   d = $.Deferred()
    #   doAsync ->
    #     d.resolve() # or .reject()
    #   return d.promise()
    # ,
    #   done: (doneArgs) ->
    #     console.log 'process done!'
    #   fail: (failArgs, stats) ->
    #     console.log 'process failed!'
    #   complete: (doneOrFailArgs, stats) ->
    #     console.log 'process complete!'
    #
    # `options` is the optional parameter.
    # `options` can have the following props.
    #
    # * done: [function] // invoked after main function was resolved.
    # * fail: [function] // invoked when the main function was rejected or aborted
    
    constructor: (fn, options) ->
      @options = $.extend {}, ns.Item.defaults, options
      @started = false
      @running = false
      @stopped = false
      @_fn = fn

    # === privates ===
    
    # helpers

    _attachNoDeferredMessage: (obj) ->
      obj.msg = ns.MESSAGE.error_no_deferred

    # success, fail, complete trigger methods

    _triggerSuccess: (doneArgs) ->
      @stopped = true
      @options.done?(doneArgs)
      @trigger 'success', doneArgs
      @_triggerComplete doneArgs, true

    _triggerFail: (failArgs, aborted = false, noDeferred = false) ->
      @stopped = true
      data = {}
      data.aborted = aborted
      if noDeferred then @_attachNoDeferredMessage data
      @options.fail?(failArgs, data)
      @trigger 'fail', failArgs, data
      @_triggerComplete failArgs, false, aborted, noDeferred

    _triggerComplete: (doneOrFailArgs, successed, aborted = false, noDeferred = false) ->
      data =
        successed: successed
        aborted: aborted
      if noDeferred then @_attachNoDeferredMessage data
      @options.complete?(doneOrFailArgs, data)
      @trigger 'complete', doneOrFailArgs, data

    # === public ===
    
    destroy: ->
      @off()
      @_fn = null

    stop: ->
      if @stopped
        return
      @stopped = true
      @_completeStats?.aborted = true
      @_triggerFail [], true

    run: -> # start the things!

      # this is the communicator about aborted stats.
      # main function can know if the async process was aborted or not.
      @_completeStats = aborted: false

      @started = true

      # if already stopped before `run`, I do nothing.
      if @stopped and (not @running)
        return
      
      # or Let's keep runnning
      @running = true

      # invoke the main function
      promise = @_fn @_completeStats

      # if the main function did not return `promise`,
      # we can't know the end of the process.
      # I throw the error then.
      unless ns.util.isPromise promise
        @running = false
        @_triggerFail [], false, false, true
        return

      # if there was no problem, do it.
      promise
        .then =>
          @running = false
          if @stopped
            return
          @_triggerSuccess arguments
        , =>
          @running = false
          @_triggerFail arguments, false

  # ============================================================
  # Pipeline

  class ns.Pipeline extends EveEve
    
    # default option vars

    @defaults =
      pipeSize: 3

    constructor: (options) ->
      @completeCount = 0
      @options = $.extend {}, ns.Pipeline.defaults, options
      @_items = []

    # === private ===

    # internal stopping items' helpers
    
    _beforeStoppingItems: ->
      @_stoppingItemsInProgress = true
      @trigger 'startStoppingItems'

    _afterStoppingItems: ->
      @_stoppingItemsInProgress = false
      @trigger 'endStoppingItems'
    
    # item completion handing helpres

    _handleTheLastItemCompletion: ->
      @running = false
      (wait 0).done =>
        @trigger 'allComplete'

    _handleNextRun: ->
      if @_stoppingItemsInProgress
        @once 'endStoppingItems', => @_tryToRunNextItem()
      else
        @_tryToRunNextItem()

    # item operation helpers

    _findNextPendingItem: ->
      for item in @_items
        if item.started is false
          return item
      return null

    _removeItem: (item) ->
      refreshed = []
      for current in @_items
        refreshed.push current unless current is item
      @_items = refreshed
      item.destroy()

    _tryToRunNextItem: ->
      pipeSize = @options.pipeSize
      runningCount = @getCurrentRunningItemsCount()
      hitLimit = false
      runOne = =>
        next = @_findNextPendingItem()
        if next?
          next.run()
        else
          hitLimit = true
        runningCount = @getCurrentRunningItemsCount()
      while (runningCount < pipeSize) and (not hitLimit)
        runOne()
    
    # === public ===
    
    destroy: ->
      @stopAll()
      @off()
      for item in @_items
        item.destroy()
      @_items = null

    add: (fn, options) ->

      item = new ns.Item fn, options

      item.on 'success', (doneArgs) =>
        @trigger 'itemSuccess', doneArgs

      item.on 'fail', (failArgs, data) =>
        @trigger 'itemFail', failArgs, data

      item.on 'complete', (doneOrFailArgs, data) =>
        wasTheLastItem = @_items.length is 1
        @_removeItem item
        @completeCount += 1
        @trigger 'itemComplete', doneOrFailArgs, data
        if wasTheLastItem
          @_handleTheLastItemCompletion()
        else
          @_handleNextRun()
      @_items.push item
    
    # tells you the count of the running items

    getCurrentRunningItemsCount: ->
      n = 0
      for item in @_items
        if item.running
          n += 1
      return n

    size: ->
      return @_items.length

    run: ->
      return if @running
      return unless @_items.length
      @running = true
      @_tryToRunNextItem()
    
    stopAll: ->
      @_beforeStoppingItems()
      for item in @_items
        item.stop()
      @_afterStoppingItems()

    stopAllWithoutTheLast: ->
      @_beforeStoppingItems()
      theLastItem = @_items[@_items.length - 1]
      for item in @_items
        unless item is theLastItem
          item.stop()
      @_afterStoppingItems()
      
  # ============================================================
  # globalify

  $.DeferredPipelineNs = ns
  $.DeferredPipeline = ns.Pipeline
