
var gDavSvn = (function(){
    var RET_FAIL = { ret: false };

    var HTTP_STATUS_NOT_FOUND = 404;

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

    var parseSvnDate = function(date_str){
        // 2009-08-07T19:24:38.164352Z
        //                       1          2         3          4         5            6               8     9       10        11
        var reg = new RegExp("^([0-9]+)-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2}\\.[0-9]+)((Z)|(\\+|-)([0-9]{2}):([0-9]{2}))$");
        var match_data = reg.exec(date_str);
        if (!match_data){
            return null;
        }

        var sec = parseInt(match_data[6]);
        var msec = Math.round((parseFloat(match_data[6]) - sec) * 1000);
        var value = Date.UTC(parseInt(match_data[1]), parseInt(match_data[2]), parseInt(match_data[3]),
                             parseInt(match_data[4]), parseInt(match_data[5]), sec, msec);
        if (!match_data[8]){
            var diff = parseInt(match_data[10]) * 3600 * 1000 + parseInt(match_data[11]) * 60 * 1000;
            if (match_data[9] == "+"){
                value -= diff;
            }else{
                value += diff;
            }
        }
        return new Date(value);
    };

    var findFirstChildNodeValue = function(item, name){
        var elem = item.getElementsByTagName(name);
        if (!elem){
            return null;
        }

        var first = elem[0];
        if (!first){
            return null;
        }

        var first_child = first.firstChild;
        if (!first_child){
            return null;
        }

        return first_child.nodeValue;
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
                // var allowed_actions = (res.getResponseHeader("Allow") || "").split(/\s*,/);
                // if (allowed_actions.indexOf("PROPFIND") < 0){
                //     callback(null);
                //     return;
                // }

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
                if (res.status == HTTP_STATUS_NOT_FOUND){
                    callback({ ret: false, status: HTTP_STATUS_NOT_FOUND });
                    return;
                }

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

            callback({ ret: true, vcc: obj });
        });
    };

    var davSvnGetVccWithRetry = function(url, callback){
        davSvnGetVcc(url, function(vcc_obj){
            if (!vcc_obj){
                callback(null);
                return;
            }

            if (!vcc_obj.ret){
                switch(vcc_obj.status){
                case HTTP_STATUS_NOT_FOUND:
                    // retry with parent directory
                    var parent = url.substr(0, url.lastIndexOf("/"));
                    var current_resource_name = url.substr(url.lastIndexOf("/") + 1);
                    davSvnGetVccWithRetry(parent, function(obj){
                        if (!obj){
                            callback(null);
                            return;
                        }

                        obj.vcc.path += "/" + current_resource_name;
                        callback(obj);
                        return;
                    });
                    return;
                default:
                    callback(null);
                    return;
                }
            }

            callback(vcc_obj);
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
                    var rev = findFirstChildNodeValue(log, "version-name");
                    logs.push({
                        revision: ((rev || rev !== null) ? parseInt(rev) : null),
                        comment: findFirstChildNodeValue(log, "comment"),
                        author: findFirstChildNodeValue(log, "creator-displayname"),
                        date: parseSvnDate(findFirstChildNodeValue(log, "date"))
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
            + '<propfind xmlns="DAV:"><prop>'
            + '<creator-displayname xmlns="DAV:"/>'
            + '<creationdate xmlns="DAV:"/>'
            + '<version-name xmlns="DAV:"/>'
            + '<getcontentlength xmlns="DAV:"/>'
            + '<resourcetype xmlns="DAV:"/>'
            + '</prop></propfind>';
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
                    var rev = findFirstChildNodeValue(item, "version-name");
                    var size = findFirstChildNodeValue(item, "getcontentlength");
                    array.push({
                        href: href,
                        type: type,
                        author: findFirstChildNodeValue(item, "creator-displayname"),
                        date: parseSvnDate(findFirstChildNodeValue(item, "creationdate")),
                        revision: ((rev || rev !== null) ? parseInt(rev) : null),
                        size: ((size || size !== null) ? parseInt(size) : null)
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

            davSvnGetVccWithRetry(url, function(vcc_obj){
                if (!vcc_obj){
                    callback(null);
                    return;
                }

                callback({ obj_options: obj_options, vcc: vcc_obj.vcc });
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

        davSvnOptionAndVcc(url, function(obj){
            if (!obj){
                callback(RET_FAIL);
                return;
            }

            var vcc_url = base_url + obj.vcc.vcc_path;
            davSvnGetBc(vcc_url, start_rev, function(bc){
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
                                type: item.type,
                                revision: item.revision,
                                author: item.author,
                                date: item.date,
                                size: item.size
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
