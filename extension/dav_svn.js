
var gDavSvn = (function(){
    var RET_FAIL = { ret: false };

    var parseURL = function(url){
        var match_data = url.match(/^https?:\/\/[^\/?#]+/);
        if (!match_data){
            return null;
        }

        return {
            raw_url: url,
            base_url: match_data[0]
        };
    };

    var doXmlHttpRequest = function(method, url, header, body, callback){
        var url = url.replace(/\/$/, "");

        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        for (var key in header){
            xhr.setRequestHeader(key, header[key]);
        }
        xhr.onreadystatechange = function(){
            // if (xhr.readyState == 4){
            //     alert(xhr.getAllResponseHeaders() + "\n" + xhr.responseText);
            // }
            callback(xhr);
        };
        xhr.send(body);
    };

    var davSvnOptions = function(url, header, body, callback){
        doXmlHttpRequest("OPTIONS", url, header, body, function(res){
            if (res.readyState == 4){
                callback(res);
            }
        });
    };

    var davSvnPropfind = function(url, header, body, callback){
        doXmlHttpRequest("PROPFIND", url, header, body, function(res){
            if (res.readyState == 4){
                callback(res);
            }
        });
    };

    var davSvnReport = function(url, header, body, callback){
        doXmlHttpRequest("REPORT", url, header, body, function(res){
            if (res.readyState == 4){
                callback(res);
            }
        });
    };

    var davSvnCheckConnection = function(url, callback){
        var body = '<?xml version="1.0" encoding="utf-8"?>'
            + '<D:options xmlns:D="DAV:"><D:activity-collection-set/></D:options>';
        davSvnOptions(url, {}, body, function(res){
            var obj = {};
            try{
                var allowed_actions = (res.getResponseHeader("Allow") || "").split(/\s*,/);
                if (allowed_actions.indexOf("PROPFIND") < 0){
                    callback(null);
                    return;
                }

                obj.youngest_revision = res.getResponseHeader("SVN-Youngest-Rev");
            }catch(e){
                callback(null);
                return;
            }

            callback(obj);
        });
    };

    var davSvnGetVcc = function(url, callback){
        var body = '<?xml version="1.0" encoding="utf-8"?>'
            + '<propfind xmlns="DAV:"><prop>'
            + '<version-controlled-configuration xmlns="DAV:"/>'
            + '<resourcetype xmlns="DAV:"/>'
            + '<baseline-relative-path xmlns="http://subversion.tigris.org/xmlns/dav/"/>'
            + '<repository-uuid xmlns="http://subversion.tigris.org/xmlns/dav/"/>'
            + '</prop></propfind>';

        davSvnPropfind(url, { "Depth": 0 }, body, function(res){
            var obj = {};

            try{
                var doc = res.responseXML;
                if (!(obj.vcc_path = doc.getElementsByTagName("version-controlled-configuration")[0]
                      .getElementsByTagName("href")[0].firstChild.nodeValue)){
                    callback(null);
                    return;
                }

                var elem = doc.getElementsByTagName("baseline-relative-path")[0];
                if (!elem){
                    callback(null);
                    return;
                }
                obj.path = (elem.firstChild ? elem.firstChild.nodeValue : "");
            }catch(e){
                callback(null);
                return;
            }

            callback(obj);
        });
    };

    var davSvnGetCheckInInfo = function(vcc_url, callback){
        var body = '<?xml version="1.0" encoding="utf-8"?>'
            + '<propfind xmlns="DAV:"><prop><checked-in xmlns="DAV:"/></prop></propfind>';

        davSvnPropfind(vcc_url, { "Depth": 0 }, body, function(res){
            var obj = {};

            try{
                var doc = res.responseXML;
                if (!(obj.bln = doc.getElementsByTagName("checked-in")[0]
                      .getElementsByTagName("href")[0].firstChild.nodeValue)){
                    callback(null);
                    return;
                }
            }catch(e){
                callback(null);
                return;
            }

            callback(obj);
        });
    };

    var davSvnGetBc = function(url, revision, callback){
        var body = '<?xml version="1.0" encoding="utf-8"?>'
            + '<propfind xmlns="DAV:"><prop>'
            + '<baseline-collection xmlns="DAV:"/><version-name xmlns="DAV:"/>'
            + '</prop></propfind>';
        var param = { "Depth": 0 };
        if (revision !== null){
            param["Label"] = revision;
        }
        davSvnPropfind(url, param, body, function(res){
            var obj = {};
            try{
                var doc = res.responseXML;
                if (!(obj.bc = doc.getElementsByTagName("baseline-collection")[0]
                      .getElementsByTagName("href")[0].firstChild.nodeValue)){
                    callback(null);
                    return;
                }

                if (!(obj.revision = parseInt(doc.getElementsByTagName("version-name")[0]
                                         .firstChild.nodeValue))){
                    callback(null);
                    return;
                }
            }catch(e){
                callback(null);
                return;
            }

            callback(obj);
        });
    };

    var davSvnGetLogs = function(bc_url, start_rev, end_rev, limit, callback){
        var body = '<S:log-report xmlns:S="svn:">'
            + '<S:start-revision>' + start_rev + '</S:start-revision>'
            + '<S:end-revision>' + end_rev + '</S:end-revision>'
            + '<S:limit>' + limit + '</S:limit>'
            + '<S:revprop>svn:author</S:revprop>'
            + '<S:revprop>svn:date</S:revprop>'
            + '<S:revprop>svn:log</S:revprop>'
            + '<S:path></S:path>'
            + '</S:log-report>';
        davSvnReport(bc_url, {}, body, function(res){
            var logs = [];
            try{
                var doc = res.responseXML;
                var tags = doc.getElementsByTagName("log-item");
                for (var i=0; i<tags.length; i++){
                    var log = tags[i];
                    logs.push({
                        revision: parseInt(log.getElementsByTagName("version-name")[0].firstChild.nodeValue),
                        comment: log.getElementsByTagName("comment")[0].firstChild.nodeValue,
                        author: log.getElementsByTagName("creator-displayname")[0].firstChild.nodeValue,
                        date: log.getElementsByTagName("date")[0].firstChild.nodeValue
                    });
                }
            }catch(e){
                callback(null);
                return;
            }
            callback(logs);
        });
    };

    var davSvnGetResources = function(bc_url, callback){
        var body = '<?xml version="1.0" encoding="utf-8"?>'
            + '<propfind xmlns="DAV:"><prop><resourcetype xmlns="DAV:"/></prop></propfind>';
        davSvnPropfind(bc_url, { "Depth": 1 }, body, function(res){
            var array = [];
            try{
                var doc = res.responseXML;
                var list = doc.getElementsByTagName("response");
                for (var i=0; i<list.length; i++){
                    var item = list[i];
                    var href = item.getElementsByTagName("href")[0].firstChild.nodeValue;
                    if (href == bc_url){
                        continue;
                    }

                    var type = (item.getElementsByTagName("resourcetype")[0]
                                .getElementsByTagName("collection").length == 1) ? "directory" : "file";
                    array.push({
                        href: href,
                        type: type
                    });
                }
            }catch(e){
                callback(null);
                return;
            }
            callback(array);
        });
    };

    var davSvnOptionAndVcc = function(url, callback){
        davSvnCheckConnection(url, function(obj_options){
            if (!obj_options){
                callback(null);
                return;
            }

            davSvnGetVcc(url, function(vcc){
                if (!vcc){
                    callback(null);
                    return;
                }

                callback({ obj_options: obj_options, vcc: vcc });
            });
        });
    };

    ///////////////////////////////////////////////////
    var davSvnLatestRevision = function(url, callback){
        var parsed_url = parseURL(url);
        if (!parsed_url){
            callback(RET_FAIL);
            return;
        }

        var base_url = parsed_url.base_url;
        davSvnOptionAndVcc(url, function(obj){
            if (!obj){
                callback(RET_FAIL);
                return;
            }

            var vcc_url = base_url + obj.vcc.vcc_path;
            davSvnGetCheckInInfo(vcc_url, function(check_in){
                if (!check_in){
                    callback(RET_FAIL);
                    return;
                }

                var bln_url = base_url + check_in.bln;
                davSvnGetBc(bln_url, null, function(bc){
                    if (!bc){
                        callback(RET_FAIL);
                        return;
                    }

                    callback({ ret: true, revision: bc.revision });
                });
            });
        });
    };

    var davSvnLog = function(url, start_rev, end_rev, limit, callback){
        var parsed_url = parseURL(url);
        if (!parsed_url){
            callback(RET_FAIL);
            return;
        }

        var base_url = parsed_url.base_url;
        if (start_rev == "HEAD" || start_rev === null){
            davSvnLatestRevision(url, function(obj){
                if (!obj || !(obj.ret)){
                    callback(RET_FAIL);
                    return;
                }

                davSvnLog(url, obj.revision, end_rev, limit, callback);
            });
            return;
        }

        end_rev = (end_rev || 0);

        // nest nest nest nest...
        davSvnOptionAndVcc(url, function(obj){
            if (!obj){
                callback(RET_FAIL);
                return;
            }

            var vcc_url = base_url + obj.vcc.vcc_path;
            davSvnGetCheckInInfo(vcc_url, function(check_in){
                if (!check_in){
                    callback(RET_FAIL);
                    return;
                }

                var bln_url = base_url + check_in.bln;
                davSvnGetBc(bln_url, start_rev, function(bc){
                    if (!bc){
                        callback(RET_FAIL);
                        return;
                    }

                    var bc_url = base_url + bc.bc + obj.vcc.path;
                    davSvnGetLogs(bc_url, start_rev, end_rev, limit, function(logs){
                        if (!logs){
                            callback(RET_FAIL);
                            return;
                        }

                        callback({ ret: true, logs: logs });
                    });
                });
            });
        });
    };

    // Return root_url
    var davSvnRootUrl = function(url, callback){
        davSvnOptionAndVcc(url, function(obj){
            if (!obj){
                callback(RET_FAIL);
                return;
            }

            var relative_path = obj.vcc.path;
            var ret_obj = { ret: true, path: relative_path };
            if (relative_path === ""){
                ret_obj.root_url = url.replace(/\/$/, "") + "/";
            }else{
                ret_obj.root_url = url.substr(0, url.length - relative_path.length);
            }
            callback(ret_obj);
        });
    };

    var davSvnFileList = function(url, rev, callback){
        var parsed_url = parseURL(url);
        if (!parsed_url){
            callback(RET_FAIL);
            return;
        }
        var base_url = parsed_url.base_url;

        if (rev == "HEAD" || rev === null){
            davSvnLatestRevision(url, function(obj){
                if (!obj || !(obj.ret)){
                    callback(RET_FAIL);
                    return;
                }

                davSvnFileList(url, obj.revision, callback);
            });
            return;
        }

        davSvnOptionAndVcc(url, function(obj){
            if (!obj){
                callback(RET_FAIL);
                return;
            }

            var vcc_url = base_url + obj.vcc.vcc_path;
            davSvnGetBc(vcc_url, rev, function(bc){
                if (!bc){
                    callback(RET_FAIL);
                    return;
                }

                var bc_url = base_url + bc.bc + obj.vcc.path;
                davSvnGetResources(bc_url, function(file_list){
                    if (!file_list){
                        callback(RET_FAIL);
                        return;
                    }

                    var ret_obj = {
                        ret: true,
                        file_list: file_list.map(function(item){
                            return {
                                path: item.href.substr(bc.bc.length).replace(/\/$/, ""),
                                type: item.type
                            };
                        }),
                        revision: rev
                    };
                    callback(ret_obj);
                });
            });
        });
    };

    return {
        log: davSvnLog,
        rootUrl: davSvnRootUrl,
        fileList: davSvnFileList,
        latestRevision: davSvnLatestRevision
    };
})();
