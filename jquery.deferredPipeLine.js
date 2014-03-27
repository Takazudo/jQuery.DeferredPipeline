/*! jQuery.deferredPipeline (https://github.com/Takazudo/jQuery.deferredPipeline)
 * lastupdate: 2014-03-27
 * version: 0.0.0
 * author: 'Takazudo' Takeshi Takatsudo <takazudo@gmail.com>
 * License: MIT */
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  (function($) {
    var EveEve, ns, wait;
    EveEve = window.EveEve;
    ns = {};
    ns.util = {};
    wait = function(time) {
      return $.Deferred(function(defer) {
        return setTimeout(function() {
          return defer.resolve();
        }, time);
      });
    };
    ns.MESSAGE = {
      error_no_deferred: 'Error: registered function should return a deferred'
    };
    ns.util.isPromise = function(obj) {
      if ((obj != null) && (obj.then != null) && (obj.done != null)) {
        return true;
      }
      return false;
    };
    ns.Item = (function(_super) {
      __extends(Item, _super);

      Item.defaults = {
        done: null,
        fail: null,
        complete: null
      };

      function Item(fn, options) {
        this.options = $.extend({}, ns.Item.defaults, options);
        this.started = false;
        this.running = false;
        this.stopped = false;
        this._fn = fn;
      }

      Item.prototype._attachNoDeferredMessage = function(obj) {
        return obj.msg = ns.MESSAGE.error_no_deferred;
      };

      Item.prototype._triggerSuccess = function(doneArgs) {
        var _base;
        this.stopped = true;
        if (typeof (_base = this.options).done === "function") {
          _base.done(doneArgs);
        }
        this.trigger('success', doneArgs);
        return this._triggerComplete(doneArgs, true);
      };

      Item.prototype._triggerFail = function(failArgs, aborted, noDeferred) {
        var data, _base;
        if (aborted == null) {
          aborted = false;
        }
        if (noDeferred == null) {
          noDeferred = false;
        }
        this.stopped = true;
        data = {};
        data.aborted = aborted;
        if (noDeferred) {
          this._attachNoDeferredMessage(data);
        }
        if (typeof (_base = this.options).fail === "function") {
          _base.fail(failArgs, data);
        }
        this.trigger('fail', failArgs, data);
        return this._triggerComplete(failArgs, false, aborted, noDeferred);
      };

      Item.prototype._triggerComplete = function(doneOrFailArgs, successed, aborted, noDeferred) {
        var data, _base;
        if (aborted == null) {
          aborted = false;
        }
        if (noDeferred == null) {
          noDeferred = false;
        }
        data = {
          successed: successed,
          aborted: aborted
        };
        if (noDeferred) {
          this._attachNoDeferredMessage(data);
        }
        if (typeof (_base = this.options).complete === "function") {
          _base.complete(doneOrFailArgs, data);
        }
        return this.trigger('complete', doneOrFailArgs, data);
      };

      Item.prototype.destroy = function() {
        this.off();
        return this._fn = null;
      };

      Item.prototype.stop = function() {
        var _ref;
        if (this.stopped) {
          return;
        }
        this.stopped = true;
        if ((_ref = this._completeStats) != null) {
          _ref.aborted = true;
        }
        return this._triggerFail([], true);
      };

      Item.prototype.run = function() {
        var promise;
        this._completeStats = {
          aborted: false
        };
        this.started = true;
        if (this.stopped && (!this.running)) {
          return;
        }
        this.running = true;
        promise = this._fn(this._completeStats);
        if (!ns.util.isPromise(promise)) {
          this.running = false;
          this._triggerFail([], false, false, true);
          return;
        }
        return promise.then((function(_this) {
          return function() {
            _this.running = false;
            if (_this.stopped) {
              return;
            }
            return _this._triggerSuccess(arguments);
          };
        })(this), (function(_this) {
          return function() {
            _this.running = false;
            return _this._triggerFail(arguments, false);
          };
        })(this));
      };

      return Item;

    })(EveEve);
    ns.Pipeline = (function(_super) {
      __extends(Pipeline, _super);

      Pipeline.defaults = {
        pipeSize: 3
      };

      function Pipeline(options) {
        this.completeCount = 0;
        this.options = $.extend({}, ns.Pipeline.defaults, options);
        this._items = [];
      }

      Pipeline.prototype._beforeStoppingItems = function() {
        this._stoppingItemsInProgress = true;
        return this.trigger('startStoppingItems');
      };

      Pipeline.prototype._afterStoppingItems = function() {
        this._stoppingItemsInProgress = false;
        return this.trigger('endStoppingItems');
      };

      Pipeline.prototype._handleTheLastItemCompletion = function() {
        this.running = false;
        return (wait(0)).done((function(_this) {
          return function() {
            return _this.trigger('allComplete');
          };
        })(this));
      };

      Pipeline.prototype._handleNextRun = function() {
        if (this._stoppingItemsInProgress) {
          return this.once('endStoppingItems', (function(_this) {
            return function() {
              return _this._tryToRunNextItem();
            };
          })(this));
        } else {
          return this._tryToRunNextItem();
        }
      };

      Pipeline.prototype._findNextPendingItem = function() {
        var item, _i, _len, _ref;
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          if (item.started === false) {
            return item;
          }
        }
        return null;
      };

      Pipeline.prototype._removeItem = function(item) {
        var current, refreshed, _i, _len, _ref;
        refreshed = [];
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          current = _ref[_i];
          if (current !== item) {
            refreshed.push(current);
          }
        }
        this._items = refreshed;
        return item.destroy();
      };

      Pipeline.prototype._tryToRunNextItem = function() {
        var hitLimit, pipeSize, runOne, runningCount, _results;
        pipeSize = this.options.pipeSize;
        runningCount = this.getCurrentRunningItemsCount();
        hitLimit = false;
        runOne = (function(_this) {
          return function() {
            var next;
            next = _this._findNextPendingItem();
            if (next != null) {
              next.run();
            } else {
              hitLimit = true;
            }
            return runningCount = _this.getCurrentRunningItemsCount();
          };
        })(this);
        _results = [];
        while ((runningCount < pipeSize) && (!hitLimit)) {
          _results.push(runOne());
        }
        return _results;
      };

      Pipeline.prototype.destroy = function() {
        var item, _i, _len, _ref;
        this.stopAll();
        this.off();
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          item.destroy();
        }
        return this._items = null;
      };

      Pipeline.prototype.add = function(fn, options) {
        var item;
        item = new ns.Item(fn, options);
        item.on('success', (function(_this) {
          return function(doneArgs) {
            return _this.trigger('itemSuccess', doneArgs);
          };
        })(this));
        item.on('fail', (function(_this) {
          return function(failArgs, data) {
            return _this.trigger('itemFail', failArgs, data);
          };
        })(this));
        item.on('complete', (function(_this) {
          return function(doneOrFailArgs, data) {
            var wasTheLastItem;
            wasTheLastItem = _this._items.length === 1;
            _this._removeItem(item);
            _this.completeCount += 1;
            _this.trigger('itemComplete', doneOrFailArgs, data);
            if (wasTheLastItem) {
              return _this._handleTheLastItemCompletion();
            } else {
              return _this._handleNextRun();
            }
          };
        })(this));
        return this._items.push(item);
      };

      Pipeline.prototype.getCurrentRunningItemsCount = function() {
        var item, n, _i, _len, _ref;
        n = 0;
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          if (item.running) {
            n += 1;
          }
        }
        return n;
      };

      Pipeline.prototype.size = function() {
        return this._items.length;
      };

      Pipeline.prototype.run = function() {
        if (this.running) {
          return;
        }
        if (!this._items.length) {
          return;
        }
        this.running = true;
        return this._tryToRunNextItem();
      };

      Pipeline.prototype.stopAll = function() {
        var item, _i, _len, _ref;
        this._beforeStoppingItems();
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          item.stop();
        }
        return this._afterStoppingItems();
      };

      Pipeline.prototype.stopAllWithoutTheLast = function() {
        var item, theLastItem, _i, _len, _ref;
        this._beforeStoppingItems();
        theLastItem = this._items[this._items.length - 1];
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          if (item !== theLastItem) {
            item.stop();
          }
        }
        return this._afterStoppingItems();
      };

      return Pipeline;

    })(EveEve);
    $.DeferredPipelineNs = ns;
    return $.DeferredPipeline = ns.Pipeline;
  })(jQuery);

}).call(this);
