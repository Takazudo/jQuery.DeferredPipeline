do ($ = jQuery) ->

  # define namespaces
  ns = {}
  ns.util = {}

  # messages
  ns.MSG =
    error_no_deferred: 'Error: registered function should return a deferred';

  # from global
  EveEve = window.EveEve

  # tiny util
  wait = (time) ->
    return $.Deferred (defer) ->
      setTimeout ->
        defer.resolve()
      , time

  # ============================================================
  # utils
  
  ns.util.isPromise = (obj) ->
    if obj? and obj.then? and obj.done?
      return true
    return false

  # ============================================================
  # Item

  class ns.Item extends EveEve
    
    constructor: (fn, @options={}) ->
      @started = false
      @running = false
      @stopped = false
      @defer = $.Deferred()
      @_fn = fn

    _attachNoDeferredMessage: (obj) ->
      obj.msg = ns.MSG.error_no_deferred

    _triggerSuccess: (doneArgs) ->
      @stopped = true
      @options.done?(doneArgs)
      @trigger 'success', doneArgs
      @_triggerComplete doneArgs, true

    _triggerFail: (failArgs, aborted = false, noDeferred = false) ->
      @stopped = true
      data = {}
      data.aborted = if aborted then true else false
      if noDeferred then @_attachNoDeferredMessage data
      @options.fail?(failArgs, data)
      @trigger 'fail', failArgs, data
      @_triggerComplete failArgs, false, aborted, noDeferred

    _triggerComplete: (doneOrFailArgs, successed, aborted = false, noDeferred = false) ->
      data =
        successed: successed
      if noDeferred then @_attachNoDeferredMessage data
      @trigger 'complete', doneOrFailArgs, data
      @defer.resolve()

    stop: ->
      if @stopped
        return
      @stopped = true
      @_completeStats?.aborted = true
      @_triggerFail [], true

    run: ->

      @_completeStats =
        aborted: false
      @started = true

      if @stopped and (not @running)
        return
      
      @running = true
      promise = @_fn @_completeStats

      if ns.util.isPromise promise
        promise
          .then =>
            @running = false
            if @stopped
              return
            @_triggerSuccess arguments
          , =>
            @running = false
            @_triggerFail arguments, false
      else
        @running = false
        @_triggerFail [], false, false, true

  # ============================================================
  # Pipeline

  class ns.Pipeline extends EveEve
    
    @defaults =
      pipeSize: 3

    constructor: (options) ->
      @completeCount = 0
      @options = $.extend {}, ns.Pipeline.defaults, options
      @_items = []

    add: (fn, options) ->
      item = new ns.Item fn, options
      item.on 'success', (data) =>
        @trigger 'itemSuccess', data
      item.on 'fail', (data) =>
        @trigger 'itemFail', data
      item.on 'complete', (data) =>
        wasTheLastItem = @_items.length is 1
        @removeItem item
        @completeCount += 1
        @trigger 'itemComplete', data
        if wasTheLastItem
          @running = false
          (wait 0).done =>
            @trigger 'allComplete'
        else
          if @_stopItemsInProgress
            @once 'stopItemsComplete', =>
              @tryToRunNextItem()
          else
            @tryToRunNextItem()
      @_items.push item

    findNextPendingItem: ->
      for item in @_items
        if item.started is false
          return item
      return null

    getCurrentRunningItemsCount: ->
      n = 0
      for item in @_items
        if item.running
          n += 1
      return n

    tryToRunNextItem: ->
      pipeSize = @options.pipeSize
      runningCount = @getCurrentRunningItemsCount()
      hitLimit = false
      runOne = =>
        next = @findNextPendingItem()
        if next?
          next.run()
        else
          hitLimit = true
        runningCount = @getCurrentRunningItemsCount()
      while (runningCount < pipeSize) and (not hitLimit)
        runOne()

    removeItem: (item) ->
      refreshed = []
      for current in @_items
        refreshed.push current unless current is item
      @_items = refreshed

    size: ->
      return @_items.length

    run: ->
      return if @running
      return unless @_items.length
      @running = true
      @tryToRunNextItem()
    
    stopAll: ->
      @_stopItemsInProgress = true
      for item in @_items
        item.stop()
      @_stopItemsInProgress = false
      @trigger 'stopItemsComplete'

    stopAllWithoutTheLast: ->
      @_stopItemsInProgress = true
      theLastItem = @_items[@_items.length - 1]
      for item in @_items
        unless item is theLastItem
          item.stop()
      @_stopItemsInProgress = false
      @trigger 'stopItemsComplete'
      
    destroy: ->
      @stopAll()
      @off()
      @_items = null

  # ============================================================
  # globalify

  $.DeferredPipelineNs = ns
  $.DeferredPipeline = ns.Pipeline

