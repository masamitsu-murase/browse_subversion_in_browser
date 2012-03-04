
var DavSvnResource = function(name, type, info){
    this.m_type = type;
    if (type == DavSvnResource.TYPE_DIRECTORY){
        this.m_dir_state = DavSvnResource.DIR_CLOSED;
    }
    this.m_name = name;
    this.m_state = DavSvnResource.STATE_NOT_LOADED;
    this.m_children = {};
    this.m_parent = null;
    this.m_info = (info || {});
};
DavSvnResource.prototype = {
    type: function(){ return this.m_type; },
    name: function(){ return this.m_name; },
    state: function(){ return this.m_state; },
    setState: function(state){ this.m_state = state; },

    dirOpened: function(){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "dirOpened error";
        }
        return this.m_dir_state == DavSvnResource.DIR_OPENED;
    },
    setDirState: function(state){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "setDirState error";
        }
        this.m_dir_state = state;
    },

    isRoot: function(){
        return (this.name() === "" && this.isDirectory());
    },
    isDirectory: function(){
        return this.type() == DavSvnResource.TYPE_DIRECTORY;
    },
    isFile: function(){
        return this.type() == DavSvnResource.TYPE_FILE;
    },

    addChild: function(child){
        var name = child.name();
        this.m_children[name] = child;
        child.setParent(this);
    },
    children: function(){
        var keys = [];
        for (var k in this.m_children){
            keys.push(k);
        }
        keys.sort();
        return keys.map(function(k){ return this.m_children[k]; }, this);
    },
    childDirs: function(){
        return this.children().filter(function(child){ return child.isDirectory(); });
    },
    childFiles: function(){
        return this.children().filter(function(child){ return child.isFile(); });
    },
    hasChild: function(name){
        return this.m_children[name] != null;
    },
    findChild: function(name){
        return this.m_children[name];
    },
    parent: function(){ return this.m_parent; },
    setParent: function(parent){
        this.m_parent = parent;
    },

    path: function(){
        var path = this.name();
        var resource = this.parent();
        while(resource && !(resource.isRoot())){
            path = resource.name() + "/" + path;
            resource = resource.parent();
        }
        return path;
    },

    debugInfo: function(level){
        level = (level || 0);
        var space = "";
        for (var i=0; i<level; i++){
            space += "    ";
        }
        var str = space + this.name() + ": " + (this.type()==DavSvnResource.TYPE_FILE ? "file" : "dir");
        var keys = [];
        for (var k in this.m_children){
            keys.push(k);
        }
        keys.sort();
        str += "\n" + keys.map(function(k){ return this.m_children[k].debugInfo(level + 1); }, this).join("\n");
        return str;
    }
};
DavSvnResource.TYPE_FILE = 1;
DavSvnResource.TYPE_DIRECTORY = 2;
DavSvnResource.DIR_OPENED = 1;
DavSvnResource.DIR_CLOSED = 2;
DavSvnResource.STATE_LOADING = 1;
DavSvnResource.STATE_LOADED = 2;
DavSvnResource.STATE_NOT_LOADED = 3;


var DavSvnModel = function(url, revision){
    this.m_peg_revision = (revision || "HEAD");
    this.m_operation_revision = (revision || "HEAD");
    this.m_root_url = null;
    this.m_current_path = null;
    this.m_listeners = [];
    this.m_root_dir = null;

    // initialize
    var self = this;
    gDavSvn.rootUrl(url, function(obj){
        if (!(obj.ret)){
            return;
        }

        self.m_root_url = obj.root_url;
        self.m_current_path = obj.path;
        self.reloadPath(obj.path);
    });
};
DavSvnModel.prototype = {
    addListener: function(listener){
        this.m_listeners.push(listener);
    },
    notify: function(){
        this.m_listeners.forEach(function(listener){
            listener.update();
        });
    },

    repositoryInfo: function(){
        return {
            uuid: "not implemented yet",
            root_url: this.m_root_url
        };
    },
    reloadPath: function(path){
        var self = this;
        gDavSvn.fileList(this.m_root_url + path, this.m_operation_revision, function(obj){
            if (!(obj.ret)){
                return;
            }

            // add files
            var target = obj.file_list.shift();
            var target_resource = new DavSvnResource(target.path.split("/").pop(),
                                                     (target.type == "file" ? DavSvnResource.TYPE_FILE
                                                      : DavSvnResource.TYPE_DIRECTORY));
            obj.file_list.forEach(function(file){
                target_resource.addChild(new DavSvnResource(file.path.split("/").pop(),
                                                            (file.type == "file" ? DavSvnResource.TYPE_FILE
                                                             : DavSvnResource.TYPE_DIRECTORY)));
            });
            self.setResource(target_resource, target.path);
            self.notify();
        });
    },
    changePath: function(path){
    },

    setResource: function(resource, path){
        var dir = this.m_root_dir = (this.m_root_dir || new DavSvnResource("", DavSvnResource.TYPE_DIRECTORY));
        if (path === ""){
            return;
        }

        var paths = path.split("/");
        paths.pop();
        paths.forEach(function(name){
            if (dir.hasChild(name)){
                dir = dir.findChild(name);
            }else{
                var new_dir = new DavSvnResource(name, DavSvnResource.TYPE_DIRECTORY);
                dir.addChild(new_dir);
                dir = new_dir;
            }
        });
        dir.addChild(resource);
    },
    resource: function(path){
        if (path === "" || !path){
            // this means root.
            return this.m_root_dir;
        }

        var paths = path.split("/");
        var dir = this.m_root_dir;
        for (var i=0; i<paths.length; i++){
            var name = paths[i];
            if (dir.hasChild(name)){
                dir = dir.findResource(name);
            }else{
                return null;
            }
        }
        return dir;
    },

    directoryTree: function(){
       
    }
};

