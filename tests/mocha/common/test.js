(function() {
  var wait;

  wait = function(time) {
    return $.Deferred(function(defer) {
      return setTimeout(function() {
        return defer.resolve();
      }, time);
    });
  };

  describe('common', function() {
    it('should export namespace to global', function() {
      return (expect($.DeferredPipelineNs)).to.be.a('object');
    });
    return describe('utils', function() {
      return describe('isPromise', function() {
        it('should return true if passed fn returns deferred', function() {
          var fn, res;
          fn = function() {
            return $.Deferred().promise();
          };
          res = $.DeferredPipelineNs.util.isPromise(fn());
          return (expect(res)).to.be(true);
        });
        return it('should return false unless passed fn returns deferred', function() {
          var fn, res;
          fn = function() {};
          res = $.DeferredPipelineNs.util.isPromise(fn());
          return (expect(res)).to.be(false);
        });
      });
    });
  });

  describe('ns.Pipeline', function() {
    describe('base stuff', function() {
      it('should create instance', function() {
        var instance;
        instance = new $.DeferredPipelineNs.Pipeline;
        return (expect(instance)).to.be.an('object');
      });
      return it('should destroy instance', function() {
        var instance;
        instance = new $.DeferredPipelineNs.Pipeline;
        instance.destroy();
        return (expect(instance._items != null)).to.be(false);
      });
    });
    describe('basic methods', function() {
      it('should add functions', function() {
        var pipeline;
        pipeline = new $.DeferredPipelineNs.Pipeline;
        pipeline.add($.noop, {
          done: $.noop,
          fail: $.noop
        });
        pipeline.add($.noop);
        return pipeline.add($.noop, {
          done: $.noop,
          fail: $.noop
        });
      });
      return it('should has size', function() {
        var pipeline;
        pipeline = new $.DeferredPipelineNs.Pipeline;
        pipeline.add($.noop, {
          done: $.noop,
          fail: $.noop
        });
        pipeline.add($.noop);
        pipeline.add($.noop, {
          done: $.noop,
          fail: $.noop
        });
        return (expect(pipeline.size())).to.be(3);
      });
    });
    describe('basic behaviors', function() {
      it('runs registered function', function(done) {
        var fn1, pipeline, spy1;
        spy1 = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          (wait(10)).done(function() {
            d.resolve();
            spy1();
            return done();
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1);
        return pipeline.run();
      });
      it('should fail unless registered function returns deferred', function(done) {
        var failSpy, fn1, pipeline;
        failSpy = sinon.spy();
        fn1 = function() {};
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1);
        pipeline.on('itemFail', function(error) {
          return failSpy();
        });
        pipeline.on('allComplete', function() {
          (expect(failSpy.called)).to.be(true);
          return done();
        });
        return pipeline.run();
      });
      it('runs `done` option callback', function(done) {
        var fn1, pipeline, spy_fn1;
        spy_fn1 = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          (wait(10)).done(function() {
            spy_fn1();
            return d.resolve('arg1', 'arg2');
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1, {
          done: function(doneArgs) {
            (expect(spy_fn1.called)).to.be(true);
            (expect(doneArgs[0])).to.be('arg1');
            (expect(doneArgs[1])).to.be('arg2');
            return done();
          }
        });
        return pipeline.run();
      });
      it('runs `fail` option callback', function(done) {
        var fn1, pipeline, spy_fn1;
        spy_fn1 = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          (wait(10)).done(function() {
            spy_fn1();
            return d.reject('arg1', 'arg2');
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1, {
          fail: function(failArgs, data) {
            (expect(spy_fn1.called)).to.be(true);
            (expect(data.aborted)).to.be(false);
            (expect(failArgs[0])).to.be('arg1');
            (expect(failArgs[1])).to.be('arg2');
            return done();
          }
        });
        return pipeline.run();
      });
      it('receives aborted status about `fail` option callback', function(done) {
        var fn1, pipeline, spy_fail, spy_fn1;
        spy_fn1 = sinon.spy();
        spy_fail = sinon.spy();
        fn1 = function(stats) {
          var d;
          d = $.Deferred();
          (wait(40)).done(function() {
            spy_fn1();
            (expect(stats.aborted)).to.be(true);
            return d.resolve();
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1, {
          fail: function(failArgs, data) {
            spy_fail();
            return (expect(data.aborted)).to.be(true);
          }
        });
        pipeline.run();
        (wait(10)).done(function() {
          return pipeline.stopAll();
        });
        return (wait(80)).done(function() {
          (expect(spy_fn1.calledOnce)).to.be(true);
          (expect(spy_fail.calledOnce)).to.be(true);
          return done();
        });
      });
      it('runs `complete` option callback when resolved', function(done) {
        var fn1, pipeline, spy_fn1;
        spy_fn1 = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          (wait(10)).done(function() {
            spy_fn1();
            return d.resolve('arg1', 'arg2');
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1, {
          complete: function(doneArgs) {
            (expect(spy_fn1.called)).to.be(true);
            (expect(doneArgs[0])).to.be('arg1');
            (expect(doneArgs[1])).to.be('arg2');
            return done();
          }
        });
        return pipeline.run();
      });
      return it('runs `fail` option callback', function(done) {
        var fn1, pipeline, spy_fn1;
        spy_fn1 = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          (wait(10)).done(function() {
            spy_fn1();
            return d.reject('arg1', 'arg2');
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1, {
          complete: function(failArgs, data) {
            console.log(data);
            (expect(spy_fn1.called)).to.be(true);
            (expect(data.aborted)).to.be(false);
            (expect(failArgs[0])).to.be('arg1');
            (expect(failArgs[1])).to.be('arg2');
            return done();
          }
        });
        return pipeline.run();
      });
    });
    describe('pipeSize patterns', function() {
      var addWaitFns, createWaitFn, itemsCount, pipeSize, randomNum, _i, _results;
      randomNum = function() {
        return Math.floor(Math.random() * 10);
      };
      createWaitFn = function(done) {
        return function() {
          var d;
          d = $.Deferred();
          (wait(randomNum())).done(function() {
            d.resolve();
            return done();
          });
          return d.promise();
        };
      };
      addWaitFns = function(count, pipeline, spy) {
        var fn, num, _i, _results;
        _results = [];
        for (num = _i = 1; 1 <= count ? _i <= count : _i >= count; num = 1 <= count ? ++_i : --_i) {
          fn = createWaitFn(function() {
            return spy();
          });
          _results.push(pipeline.add(fn));
        }
        return _results;
      };
      _results = [];
      for (pipeSize = _i = 1; _i <= 5; pipeSize = ++_i) {
        _results.push((function() {
          var _j, _results1;
          _results1 = [];
          for (itemsCount = _j = 1; _j <= 6; itemsCount = ++_j) {
            _results1.push((function(pipeSize, itemsCount) {
              return it("should complete chaining when pipeSize is " + pipeSize + " and items' count is " + itemsCount, function(done) {
                var options, pipeline, spy;
                spy = sinon.spy();
                options = {
                  pipeSize: pipeSize
                };
                pipeline = new $.DeferredPipelineNs.Pipeline(options);
                addWaitFns(itemsCount, pipeline, spy);
                pipeline.on('itemComplete', function() {
                  var count;
                  count = pipeline.countRunningItems();
                  return (expect(count <= pipeSize)).to.be(true);
                });
                pipeline.on('allComplete', function() {
                  (expect(spy.callCount)).to.be(itemsCount);
                  return done();
                });
                return pipeline.run();
              });
            })(pipeSize, itemsCount));
          }
          return _results1;
        })());
      }
      return _results;
    });
    describe('order test', function() {
      var preparePipeLine;
      preparePipeLine = function(testDone) {
        var fn1, fn1_called, fn1_done, fn2, fn2_called, fn2_done, fn3, fn3_called, fn3_done, pipeline;
        fn1_called = sinon.spy();
        fn2_called = sinon.spy();
        fn3_called = sinon.spy();
        fn1_done = sinon.spy();
        fn2_done = sinon.spy();
        fn3_done = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          fn1_called();
          (wait(10)).done(function() {
            fn1_done();
            (expect(fn1_called.calledOnce)).to.be(true);
            (expect(fn2_called.calledOnce)).to.be(false);
            (expect(fn3_called.calledOnce)).to.be(false);
            (expect(fn1_done.calledOnce)).to.be(true);
            (expect(fn2_done.called)).to.be(false);
            (expect(fn3_done.called)).to.be(false);
            return d.resolve();
          });
          return d.promise();
        };
        fn2 = function() {
          var d;
          d = $.Deferred();
          fn2_called();
          (wait(10)).done(function() {
            fn2_done();
            (expect(fn1_called.calledOnce)).to.be(true);
            (expect(fn2_called.calledOnce)).to.be(true);
            (expect(fn3_called.calledOnce)).to.be(false);
            (expect(fn1_done.calledOnce)).to.be(true);
            (expect(fn2_done.calledOnce)).to.be(true);
            (expect(fn3_done.called)).to.be(false);
            return d.resolve();
          });
          return d.promise();
        };
        fn3 = function() {
          var d;
          d = $.Deferred();
          fn3_called();
          (wait(10)).done(function() {
            fn3_done();
            (expect(fn1_called.calledOnce)).to.be(true);
            (expect(fn2_called.calledOnce)).to.be(true);
            (expect(fn3_called.calledOnce)).to.be(true);
            (expect(fn1_done.calledOnce)).to.be(true);
            (expect(fn2_done.calledOnce)).to.be(true);
            (expect(fn3_done.calledOnce)).to.be(true);
            return d.resolve();
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1);
        pipeline.add(fn2);
        pipeline.add(fn3);
        pipeline.add(function() {
          var d;
          testDone();
          d = $.Deferred();
          d.resolve();
          return d.promise();
        });
        return pipeline;
      };
      it('should run regsitered functions sequentially', function(done) {
        var pipeline;
        pipeline = preparePipeLine(done);
        return pipeline.run();
      });
      it('should avoid secound run while running', function(done) {
        var pipeline;
        pipeline = preparePipeLine(done);
        pipeline.run();
        pipeline.run();
        pipeline.run();
        return pipeline.run();
      });
      return it('should accept secound run after the end of the first run', function(done) {
        var fn1, fn1_called, fn1_done, fn2, fn2_called, fn2_done, fn3, fn3_called, fn3_done, pipeline, secoundRun;
        fn1_called = sinon.spy();
        fn2_called = sinon.spy();
        fn3_called = sinon.spy();
        fn1_done = sinon.spy();
        fn2_done = sinon.spy();
        fn3_done = sinon.spy();
        fn1 = function() {
          var d;
          d = $.Deferred();
          fn1_called();
          (wait(10)).done(function() {
            fn1_done();
            (expect(fn1_called.calledOnce)).to.be(true);
            (expect(fn2_called.calledOnce)).to.be(false);
            (expect(fn3_called.calledOnce)).to.be(false);
            (expect(fn1_done.calledOnce)).to.be(true);
            (expect(fn2_done.called)).to.be(false);
            (expect(fn3_done.called)).to.be(false);
            return d.resolve();
          });
          return d.promise();
        };
        fn2 = function() {
          var d;
          d = $.Deferred();
          fn2_called();
          (wait(10)).done(function() {
            fn2_done();
            (expect(fn1_called.calledOnce)).to.be(true);
            (expect(fn2_called.calledOnce)).to.be(true);
            (expect(fn3_called.calledOnce)).to.be(false);
            (expect(fn1_done.calledOnce)).to.be(true);
            (expect(fn2_done.calledOnce)).to.be(true);
            (expect(fn3_done.called)).to.be(false);
            return d.resolve();
          });
          return d.promise();
        };
        fn3 = function() {
          var d;
          d = $.Deferred();
          fn3_called();
          (wait(10)).done(function() {
            fn3_done();
            (expect(fn1_called.calledOnce)).to.be(true);
            (expect(fn2_called.calledOnce)).to.be(true);
            (expect(fn3_called.calledOnce)).to.be(true);
            (expect(fn1_done.calledOnce)).to.be(true);
            (expect(fn2_done.calledOnce)).to.be(true);
            (expect(fn3_done.calledOnce)).to.be(true);
            return d.resolve();
          });
          return d.promise();
        };
        pipeline = new $.DeferredPipelineNs.Pipeline({
          pipeSize: 1
        });
        pipeline.add(fn1);
        pipeline.add(fn2);
        secoundRun = function() {
          pipeline.once('allComplete', done);
          pipeline.add(fn3);
          return pipeline.run();
        };
        pipeline.once('allComplete', secoundRun);
        return pipeline.run();
      });
    });
    return (function() {
      var addWaitFns, createWaitFn, randomNum;
      randomNum = function() {
        return Math.floor(Math.random() * 10);
      };
      createWaitFn = function() {
        return function() {
          var d;
          d = $.Deferred();
          (wait(randomNum())).done(function() {
            return d.resolve();
          });
          return d.promise();
        };
      };
      addWaitFns = function(count, pipeline) {
        var fn, num, _i, _results;
        _results = [];
        for (num = _i = 1; 1 <= count ? _i <= count : _i >= count; num = 1 <= count ? ++_i : --_i) {
          fn = createWaitFn();
          _results.push(pipeline.add(fn));
        }
        return _results;
      };
      describe('stopAll method', function() {
        it('stop all runnning items', function(done) {
          var options, pipeline, spy_complete, spy_fail, spy_stop, spy_success;
          spy_success = sinon.spy();
          spy_fail = sinon.spy();
          spy_complete = sinon.spy();
          spy_stop = sinon.spy();
          options = {
            pipeSize: 3
          };
          pipeline = new $.DeferredPipelineNs.Pipeline(options);
          addWaitFns(20, pipeline);
          pipeline.on('itemComplete', function() {
            var count;
            spy_complete();
            count = pipeline.completeCount;
            if (count === 10) {
              return pipeline.stopAll();
            }
          });
          pipeline.on('itemSuccess', function() {
            return spy_success();
          });
          pipeline.on('itemFail', function() {
            return spy_fail();
          });
          pipeline.on('stop', function() {
            return spy_stop();
          });
          pipeline.on('allComplete', function() {
            (expect(spy_success.callCount)).to.be(10);
            (expect(spy_fail.callCount)).to.be(10);
            (expect(spy_complete.callCount)).to.be(20);
            (expect(spy_stop.calledOnce)).to.be(true);
            return done();
          });
          return pipeline.run();
        });
        return it('fires `fail` event only once', function(done) {
          var options, pipeline, spy_fail;
          spy_fail = sinon.spy();
          options = {
            pipeSize: 3
          };
          pipeline = new $.DeferredPipelineNs.Pipeline(options);
          addWaitFns(10, pipeline);
          pipeline.once('itemSuccess', function() {
            pipeline.stopAll();
            pipeline.stopAll();
            pipeline.stopAll();
            return (wait(10)).done(function() {
              (expect(spy_fail.callCount)).to.be(9);
              return done();
            });
          });
          pipeline.on('itemFail', function() {
            return spy_fail();
          });
          return pipeline.run();
        });
      });
      describe('stopAllWithoutTheLast method', function() {
        return it('stops all without the last one', function(done) {
          var options, pipeline, spy_complete, spy_fail, spy_stop, spy_success, spy_theLastOne;
          spy_theLastOne = sinon.spy();
          spy_success = sinon.spy();
          spy_fail = sinon.spy();
          spy_complete = sinon.spy();
          spy_stop = sinon.spy();
          options = {
            pipeSize: 3
          };
          pipeline = new $.DeferredPipelineNs.Pipeline(options);
          addWaitFns(20, pipeline);
          pipeline.add(function() {
            var d;
            d = $.Deferred();
            (wait(10)).done(function() {
              spy_theLastOne();
              return d.resolve();
            });
            return d.promise();
          });
          pipeline.on('itemComplete', function() {
            var count;
            spy_complete();
            count = pipeline.completeCount;
            if (count === 10) {
              return pipeline.stopAllWithoutTheLast();
            }
          });
          pipeline.on('itemSuccess', function() {
            return spy_success();
          });
          pipeline.on('itemFail', function() {
            return spy_fail();
          });
          pipeline.on('stop', function() {
            return spy_stop();
          });
          pipeline.on('allComplete', function() {
            (expect(spy_theLastOne.calledOnce)).to.be(true);
            (expect(spy_success.callCount)).to.be(11);
            (expect(spy_fail.callCount)).to.be(10);
            (expect(spy_complete.callCount)).to.be(21);
            (expect(spy_stop.calledOnce)).to.be(true);
            return done();
          });
          return pipeline.run();
        });
      });
      describe('run-top-run test', function() {
        return it('runs the pipe when `run` was called after `stop`', function(done) {
          var firstRun, onItemFail, onItemSuccess, options, pipeline, secondRun, spy_complete, spy_fail, spy_success;
          spy_success = sinon.spy();
          spy_fail = sinon.spy();
          spy_complete = sinon.spy();
          options = {
            pipeSize: 3
          };
          pipeline = new $.DeferredPipelineNs.Pipeline(options);
          onItemSuccess = function() {
            return spy_success();
          };
          onItemFail = function() {
            return spy_fail();
          };
          firstRun = function() {
            var onAllComplete, onItemComplete;
            addWaitFns(20, pipeline);
            onItemComplete = function() {
              var count;
              spy_complete();
              count = pipeline.completeCount;
              if (count === 10) {
                return pipeline.stopAll();
              }
            };
            onAllComplete = function() {
              (expect(spy_success.callCount)).to.be(10);
              (expect(spy_fail.callCount)).to.be(10);
              (expect(spy_complete.callCount)).to.be(20);
              pipeline.off('itemComplete', onItemComplete);
              return secondRun();
            };
            pipeline.on('itemComplete', onItemComplete);
            pipeline.on('itemSuccess', onItemSuccess);
            pipeline.on('itemFail', onItemFail);
            pipeline.once('allComplete', onAllComplete);
            return pipeline.run();
          };
          secondRun = function() {
            var onAllComplete, onItemComplete;
            addWaitFns(20, pipeline);
            onItemComplete = function() {
              var count;
              spy_complete();
              count = pipeline.completeCount;
              if (count === 30) {
                return pipeline.stopAll();
              }
            };
            onAllComplete = function() {
              (expect(spy_success.callCount)).to.be(20);
              (expect(spy_fail.callCount)).to.be(20);
              (expect(spy_complete.callCount)).to.be(40);
              pipeline.destroy();
              return done();
            };
            pipeline.on('itemComplete', onItemComplete);
            pipeline.once('allComplete', onAllComplete);
            return pipeline.run();
          };
          return firstRun();
        });
      });
      return describe('run-top-run-stop-run test', function() {
        return it('runs the pipe when `run` was called after `stop`', function(done) {
          var firstRun, onItemFail, onItemSuccess, options, pipeline, secondRun, spy_complete, spy_fail, spy_success, thirdRun;
          spy_success = sinon.spy();
          spy_fail = sinon.spy();
          spy_complete = sinon.spy();
          options = {
            pipeSize: 3
          };
          pipeline = new $.DeferredPipelineNs.Pipeline(options);
          onItemSuccess = function() {
            return spy_success();
          };
          onItemFail = function() {
            return spy_fail();
          };
          firstRun = function() {
            var onAllComplete, onItemComplete;
            addWaitFns(20, pipeline);
            onItemComplete = function() {
              var count;
              spy_complete();
              count = pipeline.completeCount;
              if (count === 10) {
                return pipeline.stopAll();
              }
            };
            onAllComplete = function() {
              (expect(spy_success.callCount)).to.be(10);
              (expect(spy_fail.callCount)).to.be(10);
              (expect(spy_complete.callCount)).to.be(20);
              pipeline.off('itemComplete', onItemComplete);
              return secondRun();
            };
            pipeline.on('itemComplete', onItemComplete);
            pipeline.on('itemSuccess', onItemSuccess);
            pipeline.on('itemFail', onItemFail);
            pipeline.once('allComplete', onAllComplete);
            return pipeline.run();
          };
          secondRun = function() {
            var onAllComplete, onItemComplete;
            addWaitFns(20, pipeline);
            onItemComplete = function() {
              var count;
              spy_complete();
              count = pipeline.completeCount;
              if (count === 30) {
                return pipeline.stopAll();
              }
            };
            onAllComplete = function() {
              (expect(spy_success.callCount)).to.be(20);
              (expect(spy_fail.callCount)).to.be(20);
              (expect(spy_complete.callCount)).to.be(40);
              return thirdRun();
            };
            pipeline.on('itemComplete', onItemComplete);
            pipeline.once('allComplete', onAllComplete);
            return pipeline.run();
          };
          thirdRun = function() {
            var onAllComplete, onItemComplete;
            addWaitFns(20, pipeline);
            onItemComplete = function() {
              return spy_complete();
            };
            onAllComplete = function() {
              (expect(spy_success.callCount)).to.be(40);
              (expect(spy_fail.callCount)).to.be(20);
              (expect(spy_complete.callCount)).to.be(80);
              pipeline.destroy();
              return done();
            };
            pipeline.on('itemComplete', onItemComplete);
            pipeline.once('allComplete', onAllComplete);
            return pipeline.run();
          };
          return firstRun();
        });
      });
    })();
  });

}).call(this);
