
$(function(){
    var i18n = {
        date: function(date, format){
            var rjust = function(num, width){
                var str = "" + num;
                if (str.length < width){
                    for (var i=0, len=width-str.length; i<len; i++){
                        str = "0" + str;
                    }
                }
                return str;
            };

            switch(navigator.language){
            case "ja":
                switch(format){
                case i18n.DATE_DATE_ONLY:
                    return rjust(date.getFullYear(), 4)
                        + "/" + rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2);
                case i18n.DATE_TIME_ONLY:
                    return rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                case i18n.DATE_DATE_TIME:
                default:
                    return rjust(date.getFullYear(), 4)
                        + "/" + rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2)
                        + " " + rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                }
                break;
            case "en":
            default:
                switch(format){
                case i18n.DATE_DATE_ONLY:
                    return rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2)
                        + "/" + rjust(date.getFullYear(), 4);
                case i18n.DATE_TIME_ONLY:
                    return rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                case i18n.DATE_DATE_TIME:
                default:
                    return rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2)
                        + "/" + rjust(date.getFullYear(), 4)
                        + " " + rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                }
                break;
            }
        },
        DATE_DATE_ONLY: 1,
        DATE_TIME_ONLY: 2,
        DATE_DATE_TIME: 3
    };

    var DirectoryView = function(view_elem, model, log_view){
        this.m_view_elem = view_elem;
        this.m_model = model;
        this.m_log_view = log_view;

        this.m_root_div = this.createRootDiv();
        this.m_view_elem.appendChild(this.m_root_div);
    };
    DirectoryView.prototype = {
        update: function(){
            this.updateTreeView();
        },

        updateTreeView: function(){
            var root_div = this.m_root_div;

            // remove current children
            while(root_div.firstChild){
                root_div.removeChild(root_div.firstChild);
            }

            // append new child
            var dir = this.m_model.resource("");
            root_div.appendChild(this.createResourceNode(dir));
        },

        createRootDiv: function(){
            var elem = document.createElement("div");
            elem.className = DirectoryView.CLASS_ROOT_DIV;
            return elem;
        },

        appendDirectoryNodeTitle: function(parent, dir){
            var self = this;

            var class_name = "ui-state-default";
            switch(dir.state()){
            case DavSvnResource.STATE_NOT_LOADED:
                class_name += " not_loaded";
                break;
            case DavSvnResource.STATE_LOADING:
                class_name += " loading";
                break;
            case DavSvnResource.STATE_LOADED:
                class_name += " loaded";
                break;
            }
            class_name += " " + (dir.dirIsOpened() ? "dir_opened" : "dir_closed");
            if (dir.path() == this.m_model.path()){
                class_name += " ui-state-highlight";
            }
            $(parent).addClass(class_name);
            $(parent).hover(function(){
                $(this).removeClass("ui-state-default").addClass("ui-state-hover");
            }, function(){
                $(this).removeClass("ui-state-hover").addClass("ui-state-default");
            });

            var title = document.createElement("span");
            parent.appendChild(title);

            // Collapse button
            var toggle_button = document.createElement("span");
            title.appendChild(toggle_button);
            class_name = DirectoryView.CLASS_COLLAPSE_BUTTON + " ui-icon ui-icon-inline-block";
            if (dir.dirIsOpened()){
                class_name += " ui-icon-triangle-1-se";
            }else{
                class_name += " ui-icon-triangle-1-e";
            }
            $(toggle_button).addClass(class_name);
            $(toggle_button).click(function(){
                var path = dir.path();
                if (dir.isLoaded()){
                    self.m_model.toggleDirectory(path);
                }else{
                    self.m_model.reloadPath(path);
                    self.m_model.openDirectory(path);
                }
            });

            // Directory/Loading icon
            var dir_icon = document.createElement("span");
            title.appendChild(dir_icon);
            class_name = "ui-icon ui-icon-inline-block";
            if (dir.isLoading()){
                class_name += " ui-icon-loading";
            }else if (dir.dirIsOpened()){
                class_name += " ui-icon-folder-open";
            }else{
                class_name += " ui-icon-folder-collapsed";
            }
            $(dir_icon).addClass(class_name);

            // Path text
            var path_elem = document.createElement("a");
            title.appendChild(path_elem);
            if (dir.isRoot()){
                path_elem.appendChild(document.createTextNode(DirectoryView.TEXT_ROOT));
            }else{
                path_elem.appendChild(document.createTextNode(dir.name()));
            }
            $(path_elem).click(function(){
                var path = dir.path();
                if (dir.isLoaded()){
                    self.m_model.changePath(path);
                    if (self.m_log_view){ self.m_log_view.changeUrl(self.m_model.repositoryInfo().root_url + path) }
                }else{
                    self.m_model.changePath(path);
                    self.m_model.reloadPath(path);
                    if (self.m_log_view){ self.m_log_view.changeUrl(self.m_model.repositoryInfo().root_url + path) }
                }
            });
            $(path_elem).dblclick(function(){
                var path = dir.path();
                self.m_model.toggleDirectory(path);
            });

            return title;
        },

        createResourceNode: function(rsc){
            var elem = document.createElement("dl");

            // Information of this element
            var resource_title = document.createElement("dt");
            resource_title.className = DirectoryView.CLASS_RESOURCE_TITLE;
            elem.appendChild(resource_title);

            this.appendDirectoryNodeTitle(resource_title, rsc);

            if (rsc.isDirectory() && rsc.dirIsOpened()){
                // Information of children
                var children_root = document.createElement("dd");
                children_root.className = DirectoryView.CLASS_CHILDREN_ROOT;
                elem.appendChild(children_root);

                var ul_children = document.createElement("ul");
                children_root.appendChild(ul_children);

                rsc.childDirs().forEach(function(child){
                    var li = document.createElement("li");
                    ul_children.appendChild(li);
                    li.appendChild(this.createResourceNode(child));
                }, this);
            }

            return elem;
        }
    };
    DirectoryView.TEXT_ROOT = "(root)";
    DirectoryView.CLASS_ROOT_DIV = "svn_root";
    DirectoryView.CLASS_RESOURCE_TITLE = "svn_resource_title";
    DirectoryView.CLASS_COLLAPSE_BUTTON = "dir_collapse";
    DirectoryView.CLASS_CHILDREN_ROOT = "svn_children_root";


    var FileListView = function(elem, model, log_view){
        // construct file list table.
        var table = document.createElement("table");
        elem.appendChild(table);
        table.className = FileListView.CLASS_ROOT_TABLE;

        var self = this;
        var attrs = FileListView.ROW_ATTRS;

        // header
        var createHeaderElement = function(th, attr){
            var button = document.createElement("button");
            th.appendChild(button);
            $(button).button({ label: FileListView["TEXT_" + attr.toUpperCase()] });
            $(button).click(function(){
                if (self.m_sort.attr == attr){
                    self.m_sort.reverse = !(self.m_sort.reverse);
                }else{
                    self.m_sort.attr = attr;
                    self.m_sort.reverse = false;
                }
                self.update();
            });
        };

        var head = [];
        var thead = document.createElement("thead");
        table.appendChild(thead);
        var tr = document.createElement("tr");
        thead.appendChild(tr);
        var th = document.createElement("th");
        tr.appendChild(th);
        head.push(th);
        createHeaderElement(th, "name");
        attrs.forEach(function(attr){
            th = document.createElement("th");
            tr.appendChild(th);
            head.push(th);
            $(th).addClass(attr);
            createHeaderElement(th, attr);
        });

        // tbody
        var tbody = document.createElement("tbody");
        table.appendChild(tbody);

        this.m_model = model;
        this.m_log_view = log_view;
        this.m_thead = head;
        this.m_tbody = tbody;
        this.m_sort = { attr: "name", reverse: false };
        this.m_current_path = null;
        this.m_selected_path = null;

        this.updateSortingHint();
    };
    FileListView.prototype = {
        update: function(){
            var current_path = this.m_model.path();
            if (this.current_path != current_path){
                this.current_path = current_path;
                this.m_selected_path = null;
            }

            this.updateSortingHint();

            // remove
            while(this.m_tbody.firstChild){
                this.m_tbody.removeChild(this.m_tbody.firstChild);
            }

            // add
            var attrs = FileListView.ROW_ATTRS;
            var rsc = this.m_model.resource(current_path);
            if (!rsc){
                return;
            }else if (rsc.isLoading()){
                var tr = document.createElement("tr");
                this.m_tbody.appendChild(tr);

                var td = document.createElement("td");
                tr.appendChild(td);
                td.setAttribute("colspan", attrs.length + 1);
                td.className = FileListView.CLASS_LOADING;

                var span = document.createElement("span");
                td.appendChild(span);
                span.appendChild(document.createTextNode(FileListView.TEXT_LOADING));
            }else{
                var sort_by = null;
                switch(this.m_sort.attr){
                case "author":
                case "revision":
                case "size":
                    var attr = this.m_sort.attr;
                    sort_by = function(item){ return item.info(attr) || ""; };
                    break;
                case "date":
                    sort_by = function(item){ return item.info("date").getTime(); };
                    break;
                case "name":
                default:
                    sort_by = function(item){ return item.name(); };
                }
                var createSorter = function(sort_by){
                    return function(l, r){
                        var lv = sort_by(l);
                        var rv = sort_by(r);
                        if (lv < rv){
                            return -1;
                        }else if (lv == rv){
                            return 0;
                        }else{
                            return 1;
                        }
                    };
                };
                var createReversedSorter = function(sorter){
                    return function(l, r){
                        return -sorter(l, r);
                    };
                };

                var attr_sorter = createSorter(sort_by);
                if (this.m_sort.reverse){
                    attr_sorter = createReversedSorter(attr_sorter);
                }

                var name_sorter = createSorter(function(item){ return item.name(); });
                var sorter = function(l, r){
                    var ret = attr_sorter(l, r);
                    if (ret != 0){
                        return ret;
                    }
                    return name_sorter(l, r);
                };

                rsc.childDirs().sort(sorter).forEach(function(item){
                    this.createRow(item);
                }, this);
                rsc.childFiles().sort(sorter).forEach(function(item){
                    this.createRow(item);
                }, this);
            }
        },

        createRow: function(rsc, text /* =null */){
            var self = this;
            var path = rsc.path();

            var tr = document.createElement("tr");
            this.m_tbody.appendChild(tr);
            $(tr).addClass("ui-state-default");
            $(tr).hover(function(){
                $(this).removeClass("ui-state-default").addClass("ui-state-hover");
            }, function(){
                $(this).removeClass("ui-state-hover").addClass("ui-state-default");
            });
            $(tr).click(function(){
                if (self.m_log_view){ self.m_log_view.changeUrl(self.m_model.repositoryInfo().root_url + path) }
                self.m_selected_path = path;
                self.update();
            });
            if (this.m_selected_path == path){
                $(tr).addClass("ui-state-highlight");
            }

            // name
            var td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("name");
            var icon = document.createElement("span");
            td.appendChild(icon);
            var class_name = "ui-icon ui-icon-inline-block";
            if (rsc.isDirectory()){
                class_name += " ui-icon-folder-collapsed";
            }else if (rsc.isFile()){
                class_name += " ui-icon-document";
            }else{
                class_name += " ui-icon-help";
            }
            $(icon).addClass(class_name);
            var text_elem = document.createElement("a");
            td.appendChild(text_elem);
            $(text_elem).addClass(FileListView.CLASS_DIR_LINK);
            text_elem.appendChild(document.createTextNode(text || rsc.name()));
            if (rsc.isDirectory()){
                $(text_elem).click(function(){
                    if (rsc.isLoaded()){
                        self.m_model.changePath(path);
                    }else{
                        self.m_model.changePath(path);
                        self.m_model.reloadPath(path);
                    }
                });
            }else if (rsc.isFile()){
                $(text_elem).attr("href", rsc.contentUrl());
            }

            // author
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("author");
            td.appendChild(document.createTextNode(rsc.info("author") || ""));

            // revision
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("revision");
            td.appendChild(document.createTextNode(rsc.info("revision")));

            // date
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("date");
            var time = document.createElement("time");
            td.appendChild(time);
            time.appendChild(document.createTextNode(i18n.date(rsc.info("date"))));
            time.setAttribute("datetime", rsc.info("date").toLocaleString());

            // size
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("size");
            if (rsc.isFile()){
                var size = rsc.info("size");
                var size_str = "";
                if (size < 1000){
                    size_str = size + " B";
                }else if (size < 1000*1000){
                    size_str = (Math.round(size / 100.0) / 10.0) + " KB";
                }else{
                    size_str = (Math.round(size / (1000 * 100.0)) / 10.0) + " MB";
                }
                td.appendChild(document.createTextNode(size_str));
                td.setAttribute("title", size + " Byte");
            }else{
                td.appendChild(document.createTextNode(" - "));
            }
        },

        updateSortingHint: function(){
            var icon = this.m_sort.reverse ? "ui-icon-carat-1-n" : "ui-icon-carat-1-s";
            if (this.m_sort.attr == "name"){
                $(this.m_thead[0]).find("button").button("option", "icons", { primary: null, secondary: icon });
                FileListView.ROW_ATTRS.forEach(function(attr, index){
                    $(this.m_thead[index + 1]).find("button").button("option", "icons",
                                                                     { primary: null, secondary: null });
                }, this);
            }else{
                $(this.m_thead[0]).find("button").button("option", "icons", { primary: null, secondary: null });
                FileListView.ROW_ATTRS.forEach(function(attr, index){
                    if (this.m_sort.attr == attr){
                        $(this.m_thead[index + 1]).find("button").button("option", "icons",
                                                                         { primary: null, secondary: icon });
                    }else{
                        $(this.m_thead[index + 1]).find("button").button("option", "icons",
                                                                         { primary: null, secondary: null });
                    }
                }, this);
            }
        }
    };
    FileListView.ROW_ATTRS = [ "author", "revision", "date", "size" ];
    FileListView.TEXT_NAME = "Name";
    FileListView.TEXT_AUTHOR = "Author";
    FileListView.TEXT_REVISION = "Revision";
    FileListView.TEXT_DATE = "Date";
    FileListView.TEXT_SIZE = "Size";
    FileListView.TEXT_LOADING = "Loading...";
    FileListView.CLASS_ROOT_TABLE = "file_list_view";
    FileListView.CLASS_LOADING = "loading";
    FileListView.CLASS_DIR_LINK = "dir_link";


    var LogView = function(elem, url, revision){
        this.m_view_elem = elem;
        this.m_url = url;
        this.m_revision = revision;
        this.updateLog();
    };
    LogView.prototype = {
        changeUrl: function(url){
            if (this.m_url != url){
                this.m_url = url;
                this.updateLog();
            }
        },

        changeRevision: function(revision){
            if (this.m_revision != revision){
                this.m_revision = revision;
                this.updateLog();
            }
        },

        updateLog: function(){
            var self = this;
            gDavSvn.log(this.m_url, this.m_revision, 0, 100, function(obj){
                if (!obj.ret){
                    return;
                }

                self.updateLogList(self.m_url, obj.logs);
            });
        },

        updateLogList: function(url, logs){
            // add
            var elem = document.createElement("dl");
            this.m_view_elem.appendChild(elem);
            $(elem).addClass(LogView.CLASS_LOG_VIEW);

            var title = document.createElement("dt");
            elem.appendChild(title);
            title.appendChild(document.createTextNode(url));

            var dd = document.createElement("dd");
            elem.appendChild(dd);
            var logs_root = document.createElement("dl");
            dd.appendChild(logs_root);
            logs.forEach(function(log){
                this.createLog(logs_root, log);
            }, this);

            // then remove current logs to keep scroll position.
            var removed_children = Array.prototype.filter.call(this.m_view_elem.childNodes, function(item){
                return item != elem;
            });
            removed_children.forEach(function(item){
                this.m_view_elem.removeChild(item);
            }, this);
        },

        createLog: function(logs_root, log){
            var dt = document.createElement("dt");
            logs_root.appendChild(dt);

            // revision
            var elem = document.createElement("span");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_REVISION);
            elem.appendChild(document.createTextNode(log.revision));

            // date
            elem = document.createElement("time");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_DATE);
            elem.appendChild(document.createTextNode(i18n.date(log.date)));
            elem.setAttribute("datetime", log.date.toLocaleString());

            // author
            elem = document.createElement("span");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_AUTHOR);
            elem.appendChild(document.createTextNode(log.author || ""));

            // first line of log
            elem = document.createElement("span");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_COMMENT);
            var comment = (log.comment || "");
            var length = comment.indexOf("\n");
            if (length < 0 || length > LogView.COMMENT_LENGTH){
                length = LogView.COMMENT_LENGTH;
            }
            var text = comment.substr(0, length);
            if (text.length < comment.length){
                text += "...";
            }
            elem.appendChild(document.createTextNode(text));

            // log
            var dd = document.createElement("dd");
            logs_root.appendChild(dd);
            var div = document.createElement("div");
            dd.appendChild(div);
            div.appendChild(document.createTextNode(comment));
            $(div).hide();  // log comment is hidden in default.

            // toggle log comment
            $(dt).addClass(LogView.CLASS_COLLAPSED);
            $(dt).click(function(){
                if ($(this).hasClass(LogView.CLASS_COLLAPSED)){
                    $(this).removeClass(LogView.CLASS_COLLAPSED);
                    $(this).next().children().show("blind");
                }else{
                    $(this).addClass(LogView.CLASS_COLLAPSED);
                    $(this).next().children().hide("blind");
                }
            });
        }
    };
    LogView.CLASS_LOG_VIEW = "log_view";
    LogView.CLASS_REVISION = "revision";
    LogView.CLASS_AUTHOR = "author";
    LogView.CLASS_DATE = "date";
    LogView.CLASS_COMMENT = "comment";
    LogView.CLASS_COLLAPSED = "collapsed";
    LogView.COMMENT_LENGTH = 40;


    var load = function(){
        // splitter
        $("#content_frame").splitter({
            splitVertical: true,
            sizeLeft: true
        });

        // model
        var model = new DavSvnModel("http://svn.apache.org/repos/asf/subversion", 1000000);
        elem = document.getElementById("dir_tree");

        // log view
        var log_view = new LogView(document.getElementById("log_view"), "", model.pegRevision());

        // file list
        var file_list_view = new FileListView(document.getElementById("file_list"), model, log_view);
        model.addListener(file_list_view);

        // directory view
        var dv = new DirectoryView(elem, model, log_view);
        model.addListener(dv);

        // resizable content_widget
        $("#content_widget").resizable({
            handles: "s",
            helper: "ui-resize-helper",
            stop: function(event, ui){
                var height = $("#content_widget").innerHeight() - $("#content_header").outerHeight();
                if (height < 0){
                    height = 10;
                }
                $("#dir_tree").css("height", height + "px");
                $("#file_list").css("height", height + "px");
                $("#content_frame").css("height", height + "px").trigger("resize");
            }
        });


        document.getElementById("change_revision").addEventListener("click", function(){
            var rev = document.getElementById("revision").value;
            if (rev != "HEAD"){
                rev = parseInt(rev);
            }
            model.setRevision(rev);
        }, false);
    };

    load();
});

