/*! jQuery.deferredPipeline (https://github.com/Takazudo/jQuery.deferredPipeline)
 * lastupdate: 2014-03-26
 * version: 0.0.0
 * author: 'Takazudo' Takeshi Takatsudo <takazudo@gmail.com>
 * License: MIT */
(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  (function($) {
    var EveEve, ns, wait;
    ns = {};
    ns.util = {};
    ns.MSG = {
      error_no_deferred: 'Error: registered function should return a deferred'
    };
    EveEve = window.EveEve;
    wait = function(time) {
      return $.Deferred(function(defer) {
        return setTimeout(function() {
          return defer.resolve();
        }, time);
      });
    };
    ns.util.isPromise = function(obj) {
      if ((obj != null) && (obj.then != null) && (obj.done != null)) {
        return true;
      }
      return false;
    };
    ns.Item = (function(_super) {
      __extends(Item, _super);

      function Item(fn, options) {
        this.options = options != null ? options : {};
        this.started = false;
        this.running = false;
        this.stopped = false;
        this.defer = $.Deferred();
        this._fn = fn;
      }

      Item.prototype._attachNoDeferredMessage = function(obj) {
        return obj.msg = ns.MSG.error_no_deferred;
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
        data.aborted = aborted ? true : false;
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
        var data;
        if (aborted == null) {
          aborted = false;
        }
        if (noDeferred == null) {
          noDeferred = false;
        }
        data = {
          successed: successed
        };
        if (noDeferred) {
          this._attachNoDeferredMessage(data);
        }
        this.trigger('complete', doneOrFailArgs, data);
        return this.defer.resolve();
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
        if (ns.util.isPromise(promise)) {
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
        } else {
          this.running = false;
          return this._triggerFail([], false, false, true);
        }
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

      Pipeline.prototype.add = function(fn, options) {
        var item;
        item = new ns.Item(fn, options);
        item.on('success', (function(_this) {
          return function(data) {
            return _this.trigger('itemSuccess', data);
          };
        })(this));
        item.on('fail', (function(_this) {
          return function(data) {
            return _this.trigger('itemFail', data);
          };
        })(this));
        item.on('complete', (function(_this) {
          return function(data) {
            var wasTheLastItem;
            wasTheLastItem = _this._items.length === 1;
            _this.removeItem(item);
            _this.completeCount += 1;
            _this.trigger('itemComplete', data);
            if (wasTheLastItem) {
              _this.running = false;
              return (wait(0)).done(function() {
                return _this.trigger('allComplete');
              });
            } else {
              if (_this._stopItemsInProgress) {
                return _this.once('stopItemsComplete', function() {
                  return _this.tryToRunNextItem();
                });
              } else {
                return _this.tryToRunNextItem();
              }
            }
          };
        })(this));
        return this._items.push(item);
      };

      Pipeline.prototype.findNextPendingItem = function() {
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

      Pipeline.prototype.tryToRunNextItem = function() {
        var hitLimit, pipeSize, runOne, runningCount, _results;
        pipeSize = this.options.pipeSize;
        runningCount = this.getCurrentRunningItemsCount();
        hitLimit = false;
        runOne = (function(_this) {
          return function() {
            var next;
            next = _this.findNextPendingItem();
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

      Pipeline.prototype.removeItem = function(item) {
        var current, refreshed, _i, _len, _ref;
        refreshed = [];
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          current = _ref[_i];
          if (current !== item) {
            refreshed.push(current);
          }
        }
        return this._items = refreshed;
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
        return this.tryToRunNextItem();
      };

      Pipeline.prototype.stopAll = function() {
        var item, _i, _len, _ref;
        this._stopItemsInProgress = true;
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          item.stop();
        }
        this._stopItemsInProgress = false;
        return this.trigger('stopItemsComplete');
      };

      Pipeline.prototype.stopAllWithoutTheLast = function() {
        var item, theLastItem, _i, _len, _ref;
        this._stopItemsInProgress = true;
        theLastItem = this._items[this._items.length - 1];
        _ref = this._items;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          item = _ref[_i];
          if (item !== theLastItem) {
            item.stop();
          }
        }
        this._stopItemsInProgress = false;
        return this.trigger('stopItemsComplete');
      };

      Pipeline.prototype.destroy = function() {
        this.stopAll();
        this.off();
        return this._items = null;
      };

      return Pipeline;

    })(EveEve);
    $.DeferredPipelineNs = ns;
    return $.DeferredPipeline = ns.Pipeline;
  })(jQuery);

}).call(this);
