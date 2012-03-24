
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

    var DirectoryView = function(view_elem, model){
        this.m_view_elem = view_elem;
        this.m_root_div = this.createRootDiv();
        this.m_view_elem.appendChild(this.m_root_div);
        this.m_model = model;
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
                }else{
                    self.m_model.changePath(path);
                    self.m_model.reloadPath(path);
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


    var FileListView = function(elem, model){
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
        this.m_thead = head;
        this.m_tbody = tbody;
        this.m_sort = { attr: "name", reverse: false };

        this.updateSortingHint();
    };
    FileListView.prototype = {
        update: function(){
            var current_path = this.m_model.path();

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
                    sort_by = function(item){ return item.info(attr); };
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
            var tr = document.createElement("tr");
            this.m_tbody.appendChild(tr);
            $(tr).addClass("ui-state-default");
            $(tr).hover(function(){
                $(this).removeClass("ui-state-default").addClass("ui-state-hover");
            }, function(){
                $(this).removeClass("ui-state-hover").addClass("ui-state-default");
            });

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
                var self = this;
                $(text_elem).click(function(){
                    if (rsc.isLoaded()){
                        self.m_model.changePath(rsc.path());
                    }else{
                        self.m_model.changePath(rsc.path());
                        self.m_model.reloadPath(rsc.path());
                    }
                });
            }else if (rsc.isFile()){
                $(text_elem).attr("href", rsc.contentUrl());
            }

            // author
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("author");
            td.appendChild(document.createTextNode(rsc.info("author")));

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


    var LogView = function(elem, model){
        this.m_view_elem = elem;
        this.m_model = model;
        this.m_path = null;
    };
    LogView.prototype = {
        update: function(){
            var path = this.m_model.path();
            if (this.m_path !== path){
                this.m_path = path;
                this.updateLog(path);
            }
        },

        updateLog: function(path){
            var url = this.m_model.repositoryInfo().root_url + path;
            var self = this;
            gDavSvn.log(url, this.m_model.pegRevision(), 0, 100, function(obj){
                if (!obj.ret){
                    return;
                }

                self.updateLogHelper(url, obj.logs);
            });
        },

        updateLogHelper: function(url, logs){
            while(this.m_view_elem.firstChild){
                this.m_view_elem.removeChild(this.m_view_elem.firstChild);
            }

            var elem = document.createElement("dl");
            this.m_view_elem.appendChild(elem);
            elem.className = LogView.CLASS_LOG_VIEW;

            var title = document.createElement("dt");
            elem.appendChild(title);
            title.appendChild(document.createTextNode(url));

            var dd = document.createElement("dd");
            elem.appendChild(dd);
            var logs_root = document.createElement("dl");
            dd.appendChild(logs_root);
            logs.forEach(function(log){
                var dt = document.createElement("dt");
                logs_root.appendChild(dt);
                dt.appendChild(document.createTextNode(log.revision + ": " + log.author + ": " + log.date));

                var dd = document.createElement("dd");
                logs_root.appendChild(dd);
                var div = document.createElement("div");
                dd.appendChild(div);
                div.appendChild(document.createTextNode(log.comment));
            });
        }
    };
    LogView.CLASS_LOG_VIEW = "log_view";


    var BasicInfoView = function(elem, model){
        this.m_model = model;

        while(elem.firstChild){
            elem.removeChild(elem.firstChild);
        }

        var dl = document.createElement("dl");
        elem.appendChild(dl);
        var dt = document.createElement("dt");
        dl.appendChild(dt);
        dt.appendChild(document.createTextNode("Path"));
        var dd = document.createElement("dd");
        dl.appendChild(dd);
        this.m_path_elem = dd;

        dt = document.createElement("dt");
        dl.appendChild(dt);
        dt.appendChild(document.createTextNode("Revision"));
        dd = document.createElement("dd");
        dl.appendChild(dd);
        this.m_revision_elem = dd;
    };
    BasicInfoView.prototype = {
        update: function(){
            if (this.m_path_elem.firstChild){
                this.m_path_elem.removeChild(this.m_path_elem.firstChild);
            }
            this.m_path_elem.appendChild(document.createTextNode(this.m_model.repositoryInfo().root_url + this.m_model.path()));

            if (this.m_revision_elem.firstChild){
                this.m_revision_elem.removeChild(this.m_revision_elem.firstChild);
            }
            this.m_revision_elem.appendChild(document.createTextNode(this.m_model.operationRevision()));
        }
    };

    var load = function(){
        // splitter
        $("#content_frame").splitter({
            splitVertical: true,
            sizeLeft: true
        });

        // view, model
        var model = new DavSvnModel("http://svn.apache.org/repos/asf/subversion", 1000000);
        elem = document.getElementById("dir_tree");
        var dv = new DirectoryView(elem, model);
        model.addListener(dv);

        var log_view = new LogView(document.getElementById("log"), model);
        model.addListener(log_view);

        // file list
        var file_list_view = new FileListView(document.getElementById("file_list"), model);
        model.addListener(file_list_view);

        // basic info
        var basic_info_view = new BasicInfoView(document.getElementById("basic_info"), model);
        model.addListener(basic_info_view);

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

