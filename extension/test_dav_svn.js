
(function(){
    var gResult = [];
    var gAsyncFlag = {};
    var WAIT_INTERVAL = 50;

    var asyncCall = function(key, funcs){
        var func = funcs[0];
        funcs.shift();
        if (func){
            gAsyncFlag[key] = false;
            func();

            var id = setInterval(function(){
                if (gAsyncFlag[key] == true){
                    if (funcs.length > 0){
                        var next_func = funcs[0];
                        funcs.shift();
                        gAsyncFlag[key] = false;
                        next_func();
                    }else{
                        clearInterval(id);
                    }
                }
            }, WAIT_INTERVAL);
        }
    };

    var assert = function(value, message){
        if (value){
            gResult.push({ result: true, message: message });
        }else{
            gResult.push({ result: false, message: message });
        }
    };
    var assertEqual = function(expected, value, message){
        if (expected === value){
            gResult.push({ result: true, message: message });
        }else{
            gResult.push({ result: false, message: message });
        }
    };

    var testDavSvnLog = function(callback){
        var root_url = "http://svn.apache.org/repos/asf";
        var dir_url = "http://svn.apache.org/repos/asf/subversion/trunk";
        var file_url = "http://svn.apache.org/repos/asf/subversion/trunk/CHANGES";

        var testGetHeadLog = function(callbackGetHeadLog){
            var key = "testGetHeadLog";
            var funcs = [ root_url, dir_url, file_url ].map(function(url){
                return function(){
                    gDavSvn.log(url, "HEAD", 0, 1, function(obj){
                        try{
                            assert(obj.ret, "logs ret check: " + url);
                            assertEqual(1, obj.logs.length, "length check: " + url);
                        }catch(e){
                            assert(false, "error");
                        }
                        gAsyncFlag[key] = true;
                    });
                };
            });
            var slash_check = [ root_url, dir_url ].map(function(url){
                return function(){
                    gDavSvn.log(url + "/", "HEAD", 0, 1, function(obj){
                        try{
                            assert(obj.ret, "logs ret check: " + url);
                            assertEqual(1, obj.logs.length, "length check: " + url);
                        }catch(e){
                            assert(false, "error");
                        }
                        gAsyncFlag[key] = true;
                    });
                };
            });

            asyncCall(key, funcs.concat(slash_check).concat([ function(){
                gAsyncFlag[key] = true;
                callbackGetHeadLog();
            } ]));
        };

        var testGetRevisionCheck = function(callbackGetRevisionCheck){
            var key = "testGetRevisionCheck";
            var dir_url = "http://svn.apache.org/repos/asf/subversion/trunk";
            var correct_response = [
                [ 999992, "philip", "2010-09-22T14:44:17.139330Z",
                  "Convert another function for SVN_WC__NODES_ONLY.\n\n* subversion/libsvn_wc/wc_db.c\n  (commit_node): Query NODES table.\n" ],
                [ 999938, "artagnon", "2010-09-22T13:36:07.035555Z",
                  "* subversion/tests/cmdline/svnrdump_tests_data/trunk-only.dump,\n  subversion/tests/cmdline/svnrdump_tests_data/trunk-only.expected.dump,\n  subversion/tests/cmdline/svnrdump_tests_data/trunk-A-changes.dump,\n  subversion/tests/cmdline/svnrdump_tests_data/trunk-A-changes.expected.dump:\n   Import new testdata from svnsync_tests_data after converting the\n   dumpfile from v2 to v3 for svnrdump.\n\n* subversion/tests/cmdline/svnrdump_tests.py\n\n  (run_dump_test): Extend function to accept an optional subdirectory\n  parameter. Update its docstring.\n\n  (only_trunk_dump, only_trunk_A_with_changes_dump): Add a couple of\n  tests to use the added testdata.\n\n  (run_test): Run both tests- mark only_trunk_dump as passing and\n  only_trunk_A_with_changes_dump as WIP since it fails.\n" ]
            ];
            asyncCall(key, [ function(){
                gDavSvn.log(dir_url, 1000000, 0, 2, function(obj){
                    try{
                        assert(obj.ret, "rev check");
                        assertEqual(2, obj.logs.length, "rev check length");
                        for (var i=0; i<2;  i++){
                            var res = correct_response[i];
                            var log = obj.logs[i];
                            assertEqual(res[0], log.revision, res[0] + ": " + log.revision);
                            assertEqual(res[1], log.author, "author");
                            assertEqual(res[2], log.date, "date: " + log.date);
                            assertEqual(res[3], log.comment, "comment");
                        }
                    }catch(e){
                        assert(false, "error");
                    }
                    gAsyncFlag[key] = true;
                });
            }, function(){
                gAsyncFlag[key] = true;
                callbackGetRevisionCheck();
            } ]);
        };

        var key = "testDavSvnLog";
        asyncCall(key, [ function(){
            testGetHeadLog(function(){
                gAsyncFlag[key] = true;
            });
        }, function(){
            testGetRevisionCheck(function(){
                gAsyncFlag[key] = true;
            });
        }, function(){
            gAsyncFlag[key] = true;
            callback();
        } ]);
    };

    var testDavSvnFileList = function(callback){
        var dir_url = "http://svn.apache.org/repos/asf/subversion/trunk";
        
        var testGetFileList = function(callbackGetFileList){
            var key = "testGetFileList";
            asyncCall(key, [ function(){
                gDavSvn.fileList(dir_url, 1000000, function(obj){
                    try{
                        var file_list = obj.file_list;
                        assertEqual(23, file_list.length, "length check: " + file_list.length);
                    }catch(e){
                        assert(false, "error");
                    }
                    gAsyncFlag[key] = true;
                });
            }, function(){
                gAsyncFlag[key] = true;
                callbackGetFileList();
            } ]);
        };

        var key = "testDavSvnFileList";
        asyncCall(key, [ function(){
            testGetFileList(function(){
                gAsyncFlag[key] = true;
            });
        }, function(){
            gAsyncFlag[key] = true;
            callback();
        } ]);
    };

    var testAll = function(){
        var key = "testAll";
        asyncCall(key, [ function(){
            testDavSvnLog(function(){
                gAsyncFlag[key] = true;
            });
        }, function(){
            testDavSvnFileList(function(){
                gAsyncFlag[key] = true;
            });
        }, function(){
            showResult();
            gAsyncFlag[key] = true;
        } ]);
    };

    var showResult = function(){
        var t = gResult.filter(function(item){ return !(item.result); }).map(function(item){
            return "*: " + item.message;
        }).join("\n");
        alert(t || "OK");
    };

    // Do!
    testAll();
})();
