
var DavSvnResource = function(type, root_url, path, revision, last_modified_revision, state){
    this.m_type = type;
    this.m_root_url = root_url;
    this.m_path = path;
    this.m_revision = revision;
    this.m_last_modified_revision = last_modified_revision;
    this.m_state = state;
    this.m_children = [];
};
DavSvnResource.prototype = {
    type: function(){ return this.m_type; },
    root_url: function(){ return this.m_root_url; },
    path: function(){ return this.m_path; },
    url: function(){ return this.m_root_url + this.m_path; },
    revision: function(){ return this.m_revision; },
    lastModifiedRevision: function(){ return this.m_last_modified_revision; },
    state: function(){ return this.m_state; },
    setState: function(state){ this.m_state = state; },
    addChild: function(child){ this.m_children.push(child); },
    children: function(){ return this.m_children; }
};
DavSvnResource.TYPE_DIRECTORY = 1;
DavSvnResource.TYPE_FILE = 2;
DavSvnResource.STATE_LOADING = 1;
DavSvnResource.STATE_LOADED = 2;
DavSvnResource.STATE_NOT_LOADED = 3;


var DavSvnModel = function(url, revision){
    this.m_peg_revision = (revision || "HEAD");
    this.m_operation_revision = (revision || "HEAD");
    this.m_root_url = null;
    this.m_current_path = null;
    this.m_listeners = [];

    // initialize
    var self = this;
    gDavSvn.rootUrl(url, function(obj){
        if (!(obj.ret)){
            return;
        }

        self.m_root_url = obj.root_url;
        self.m_current_path = obj.path;
        self.notify();

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
    },
    changePath: function(path){
    },
    directoryTree: function(){
        
    }
};

