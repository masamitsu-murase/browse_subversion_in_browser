
(function(){
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
            var children = root_div.childNodes;
            for (var i=0; i<children.length; i++){
                root_div.removeChild(children[i]);
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

        createResourceNode: function(rsc){
            var elem = document.createElement("dl");

            // Information of this element
            var resource_title = document.createElement("dt");
            resource_title.className = DirectoryView.CLASS_RESOURCE_TITLE;
            elem.appendChild(resource_title);

            var title = document.createElement("span");
            if (rsc.isRoot()){
                title.appendChild(document.createTextNode(this.m_model.repositoryInfo().root_url));
            }else{
                title.appendChild(document.createTextNode(rsc.name()));
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
            title.className = class_name;
            resource_title.appendChild(title);

            // event for title
            if (rsc.isDirectory()){
                var path = rsc.path();
                var self = this;
                title.addEventListener("click", function(){
                    self.m_model.reloadPath(path);
                });
            }

            if (rsc.isDirectory()){
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


    var load = function(){
        // for test
        var elem = document.getElementById("test");
        elem.addEventListener("click", function(){
            gTestDavSvn.testAll(document.getElementById("output"));
        }, false);

        // view, model
        elem = document.getElementById("output");
        var model = new DavSvnModel("http://svn.apache.org/repos/asf/subversion", 1000000);
        model.addListener(new DirectoryView(elem, model));

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

