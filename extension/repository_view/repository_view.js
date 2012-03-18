
(function(){
    var DirectoryView = function(view_elem, model){
        this.m_view_elem = view_elem;
        this.m_root_div = this.createRootDiv();
        this.m_view_elem.appendChild(this.m_root_div);
        this.m_model = model;

        this.m_log_view = null;
    };
    DirectoryView.prototype = {
        update: function(){
            this.updateTreeView();
        },

        updateTreeView: function(){
            var root_div = this.m_root_div;

            // remove current children
            var children = root_div.childNodes;
            for (var i=0; i<children.length; i++){
                root_div.removeChild(children[i]);
            }

            // append new child
            var dir = this.m_model.resource("");
            root_div.appendChild(this.createResourceNode(dir));
        },

        setLogView: function(log_view){
            this.m_log_view = log_view;
        },

        createRootDiv: function(){
            var elem = document.createElement("div");
            elem.className = DirectoryView.CLASS_ROOT_DIV;
            return elem;
        },

        createResourceNodeTitle: function(rsc){
            var title = document.createElement("span");
            var path_elem = document.createElement("span");
            title.appendChild(path_elem);

            if (rsc.isRoot()){
                path_elem.appendChild(document.createTextNode(this.m_model.repositoryInfo().root_url));
            }else{
                path_elem.appendChild(document.createTextNode(rsc.name()));
            }
            var class_name = rsc.isDirectory() ? DirectoryView.CLASS_TYPE_DIRECTORY : DirectoryView.CLASS_TYPE_FILE;
            switch(rsc.state()){
            case DavSvnResource.STATE_NOT_LOADED:
                class_name = class_name + " not_loaded";
                break;
            case DavSvnResource.STATE_LOADING:
                class_name = class_name + " loading";
                break;
            case DavSvnResource.STATE_LOADED:
                class_name = class_name + " loaded";
                break;
            }
            if (rsc.isDirectory()){
                class_name = class_name + " " + (rsc.dirIsOpened() ? "dir_opened" : "dir_closed");
            }
            title.className = class_name;

            // event for title
            if (rsc.isDirectory()){
                var path = rsc.path();
                var self = this;
                path_elem.addEventListener("click", function(){
                    if (self.m_log_view){
                        self.m_log_view.updateLog(path);
                    }

                    self.m_model.changePath(path);
                    if (rsc.isLoaded()){
                        self.m_model.changePath(path);
                        self.m_model.toggleDirectory(path)
                    }else{
                        self.m_model.changePath(path);
                        self.m_model.reloadPath(path);
                        self.m_model.openDirectory(path);
                    }
                });

                var reload_elem = document.createElement("img");
                title.appendChild(reload_elem);
                reload_elem.src = "images/icon_folder_opened.png";
                reload_elem.alt = "Reload";
                reload_elem.addEventListener("click", function(e){
                    self.m_model.changePath(path);
                    self.m_model.reloadPath(path);
                });
            }

            return title;
        },

        createResourceNode: function(rsc){
            var elem = document.createElement("dl");

            // Information of this element
            var resource_title = document.createElement("dt");
            resource_title.className = DirectoryView.CLASS_RESOURCE_TITLE;
            elem.appendChild(resource_title);

            var title = this.createResourceNodeTitle(rsc);
            resource_title.appendChild(title);

            if (rsc.isDirectory() && rsc.dirIsOpened()){
                // Information of children
                var children_root = document.createElement("dd");
                children_root.className = DirectoryView.CLASS_CHILDREN_ROOT;
                elem.appendChild(children_root);

                var ul_children = document.createElement("ul");
                children_root.appendChild(ul_children);

                rsc.childDirs().concat(rsc.childFiles()).forEach(function(child){
                    var li = document.createElement("li");
                    ul_children.appendChild(li);
                    li.appendChild(this.createResourceNode(child));
                }, this);
            }

            return elem;
        }
    };
    DirectoryView.CLASS_ROOT_DIV = "svn_root";
    DirectoryView.CLASS_RESOURCE_TITLE = "svn_resource_title";
    DirectoryView.CLASS_CHILDREN_ROOT = "svn_children_root";
    DirectoryView.CLASS_TYPE_DIRECTORY = "type_directory";
    DirectoryView.CLASS_TYPE_FILE = "type_file";


    var FileListView = function(elem, model){
        // construct file list table.
        var table = document.createElement("table");
        elem.appendChild(table);
        table.className = FileListView.CLASS_ROOT_TABLE;

        var attrs = [ "author", "revision", "date", "size" ];

        // header
        var thead = document.createElement("thead");
        table.appendChild(thead);
        var tr = document.createElement("tr");
        thead.appendChild(tr);
        var th = document.createElement("th");
        tr.appendChild(th);
        th.appendChild(document.createTextNode("Name"));
        attrs.forEach(function(attr){
            th = document.createElement("th");
            tr.appendChild(th);
            th.appendChild(document.createElement(attr));
        });

        // tbody
        var tbody = document.createElement("tbody");
        table.appendChild(tbody);

        this.m_model = model;
        this.m_tbody = tbody;
    };
    FileListView.prototype = {
        update: function(){
            var current_path = this.m_model.path();

            // remove
            var children = this.m_tbody.childNodes;
            for (var i=0; i<children.length; i++){
                this.m_tbody.removeChild(children[i]);
            }

            // add
            var rsc = this.m_model.resource(current_path);
            var self = this;
            rsc.children().forEach(function(child){
                var tr = document.createElement("tr");
                self.m_tbody.appendChild(tr);

                var td = document.createElement("td");
                tr.appendChild(td);
                td.appendChild(document.createTextNode(child.name()));

                [ "author", "revision", "date", "size" ].forEach(function(attr){
                    td = document.createElement("td");
                    tr.appendChild(td);
                    td.appendChild(document.createTextNode(child.info(attr)));
                });
            });
        }
    };
    FileListView.CLASS_ROOT_TABLE = "file_list_view";


    var LogView = function(elem, model){
        this.m_view_elem = elem;
        this.m_model = model;
    };
    LogView.prototype = {
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
            var children = this.m_view_elem.childNodes;
            for (var i=0; i<children.length; i++){
                this.m_view_elem.removeChild(children[i]);
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


    var load = function(){
        // for test
        var elem = document.getElementById("test");
        elem.addEventListener("click", function(){
            gTestDavSvn.testAll(document.getElementById("output"));
        }, false);

        // view, model
        var model = new DavSvnModel("http://svn.apache.org/repos/asf/subversion", 1000000);
        elem = document.getElementById("output");
        var dv = new DirectoryView(elem, model);
        model.addListener(dv);

        var log_elem = document.getElementById("log");
        dv.setLogView(new LogView(log_elem, model));

        // file list
        var file_list_view = new FileListView(document.getElementById("file_list"), model);
        model.addListener(file_list_view);

        /// test
        document.getElementById("change_revision").addEventListener("click", function(){
            var rev = document.getElementById("revision").value;
            if (rev != "HEAD"){
                rev = parseInt(rev);
            }
            model.setRevision(rev);
        }, false);
    };

    window.addEventListener("load", load, false);
})();

