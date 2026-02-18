//! Node.js/TypeScript bindings for the nono capability-based sandboxing library
//!
//! Provides JavaScript/TypeScript access to OS-enforced sandboxing via
//! Landlock (Linux) and Seatbelt (macOS).

use napi::bindgen_prelude::*;
use napi_derive::napi;
use nono::{
    AccessMode as RustAccessMode, CapabilitySet as RustCapabilitySet,
    FsCapability as RustFsCapability, NonoError, Sandbox, SandboxState as RustSandboxState,
};
use std::path::Path;

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

fn to_napi_err(e: NonoError) -> Error {
    match &e {
        NonoError::PathNotFound(_)
        | NonoError::ExpectedDirectory(_)
        | NonoError::ExpectedFile(_) => Error::new(Status::InvalidArg, e.to_string()),
        _ => Error::new(Status::GenericFailure, e.to_string()),
    }
}

// ---------------------------------------------------------------------------
// AccessMode
// ---------------------------------------------------------------------------

#[napi]
pub enum AccessMode {
    Read,
    Write,
    ReadWrite,
}

impl From<AccessMode> for RustAccessMode {
    fn from(mode: AccessMode) -> Self {
        match mode {
            AccessMode::Read => RustAccessMode::Read,
            AccessMode::Write => RustAccessMode::Write,
            AccessMode::ReadWrite => RustAccessMode::ReadWrite,
        }
    }
}

impl From<RustAccessMode> for AccessMode {
    fn from(mode: RustAccessMode) -> Self {
        match mode {
            RustAccessMode::Read => AccessMode::Read,
            RustAccessMode::Write => AccessMode::Write,
            RustAccessMode::ReadWrite => AccessMode::ReadWrite,
        }
    }
}

// ---------------------------------------------------------------------------
// FsCapability (read-only)
// ---------------------------------------------------------------------------

#[napi(object)]
pub struct FsCapabilityInfo {
    pub original: String,
    pub resolved: String,
    pub access: String,
    pub is_file: bool,
    pub source: String,
}

impl From<&RustFsCapability> for FsCapabilityInfo {
    fn from(cap: &RustFsCapability) -> Self {
        Self {
            original: cap.original.display().to_string(),
            resolved: cap.resolved.display().to_string(),
            access: cap.access.to_string(),
            is_file: cap.is_file,
            source: cap.source.to_string(),
        }
    }
}

// ---------------------------------------------------------------------------
// SupportInfo
// ---------------------------------------------------------------------------

#[napi(object)]
pub struct SupportInfoResult {
    pub is_supported: bool,
    pub platform: String,
    pub details: String,
}

// ---------------------------------------------------------------------------
// CapabilitySet
// ---------------------------------------------------------------------------

#[napi(js_name = "CapabilitySet")]
pub struct JsCapabilitySet {
    inner: RustCapabilitySet,
}

impl Default for JsCapabilitySet {
    fn default() -> Self {
        Self::new()
    }
}

#[napi]
impl JsCapabilitySet {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            inner: RustCapabilitySet::new(),
        }
    }

    /// Add directory access for the given path.
    ///
    /// The path is validated and canonicalized. Throws if the path does not
    /// exist or is not a directory.
    #[napi]
    pub fn allow_path(&mut self, path: String, mode: AccessMode) -> Result<()> {
        let cap = RustFsCapability::new_dir(&path, mode.into()).map_err(to_napi_err)?;
        self.inner.add_fs(cap);
        Ok(())
    }

    /// Add single-file access for the given path.
    ///
    /// The path is validated and canonicalized. Throws if the path does not
    /// exist or is not a file.
    #[napi]
    pub fn allow_file(&mut self, path: String, mode: AccessMode) -> Result<()> {
        let cap = RustFsCapability::new_file(&path, mode.into()).map_err(to_napi_err)?;
        self.inner.add_fs(cap);
        Ok(())
    }

    /// Block all outbound network access.
    #[napi]
    pub fn block_network(&mut self) {
        self.inner.set_network_blocked(true);
    }

    /// Add a command to the allow list (overrides blocklists).
    #[napi]
    pub fn allow_command(&mut self, cmd: String) {
        self.inner.add_allowed_command(cmd);
    }

    /// Add a command to the block list.
    #[napi]
    pub fn block_command(&mut self, cmd: String) {
        self.inner.add_blocked_command(cmd);
    }

    /// Add a raw platform-specific sandbox rule.
    ///
    /// On macOS, this is a Seatbelt S-expression string. Ignored on Linux.
    /// Returns an error if the rule is malformed or grants root-level access.
    #[napi]
    pub fn platform_rule(&mut self, rule: String) -> napi::Result<()> {
        self.inner
            .add_platform_rule(rule)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Remove duplicate filesystem capabilities, keeping the highest access level.
    #[napi]
    pub fn deduplicate(&mut self) {
        self.inner.deduplicate();
    }

    /// Check if the given path is covered by an existing directory capability.
    #[napi]
    pub fn path_covered(&self, path: String) -> bool {
        self.inner.path_covered(Path::new(&path))
    }

    /// Get a list of all filesystem capabilities.
    #[napi]
    pub fn fs_capabilities(&self) -> Vec<FsCapabilityInfo> {
        self.inner
            .fs_capabilities()
            .iter()
            .map(FsCapabilityInfo::from)
            .collect()
    }

    /// Whether outbound network access is blocked.
    #[napi(getter)]
    pub fn is_network_blocked(&self) -> bool {
        self.inner.is_network_blocked()
    }

    /// Get a plain-text summary of the capability set.
    #[napi]
    pub fn summary(&self) -> String {
        self.inner.summary()
    }
}

// ---------------------------------------------------------------------------
// SandboxState
// ---------------------------------------------------------------------------

#[napi(js_name = "SandboxState")]
pub struct JsSandboxState {
    inner: RustSandboxState,
}

#[napi]
impl JsSandboxState {
    /// Create a SandboxState snapshot from a CapabilitySet.
    #[napi(factory)]
    pub fn from_caps(caps: &JsCapabilitySet) -> Self {
        Self {
            inner: RustSandboxState::from_caps(&caps.inner),
        }
    }

    /// Serialize the state to a JSON string.
    #[napi]
    pub fn to_json(&self) -> Result<String> {
        self.inner.to_json().map_err(to_napi_err)
    }

    /// Deserialize state from a JSON string.
    #[napi(factory)]
    pub fn from_json(json: String) -> Result<Self> {
        let state = RustSandboxState::from_json(&json)
            .map_err(|e| Error::new(Status::InvalidArg, format!("Invalid JSON: {}", e)))?;
        Ok(Self { inner: state })
    }

    /// Reconstruct a CapabilitySet from this state.
    #[napi]
    pub fn to_caps(&self) -> Result<JsCapabilitySet> {
        let caps = self.inner.to_caps().map_err(to_napi_err)?;
        Ok(JsCapabilitySet { inner: caps })
    }

    /// Whether network is blocked in this state.
    #[napi(getter)]
    pub fn net_blocked(&self) -> bool {
        self.inner.net_blocked
    }
}

// ---------------------------------------------------------------------------
// QueryContext
// ---------------------------------------------------------------------------

#[napi(object)]
pub struct QueryResultInfo {
    pub status: String,
    pub reason: String,
    pub granted_path: Option<String>,
    pub access: Option<String>,
    pub granted: Option<String>,
    pub requested: Option<String>,
}

#[napi(js_name = "QueryContext")]
pub struct JsQueryContext {
    inner: nono::query::QueryContext,
}

#[napi]
impl JsQueryContext {
    #[napi(constructor)]
    pub fn new(caps: &JsCapabilitySet) -> Self {
        Self {
            inner: nono::query::QueryContext::new(caps.inner.clone()),
        }
    }

    /// Query whether a path operation is permitted.
    #[napi]
    pub fn query_path(&self, path: String, mode: AccessMode) -> QueryResultInfo {
        let result = self.inner.query_path(Path::new(&path), mode.into());
        query_result_to_info(&result)
    }

    /// Query whether network access is permitted.
    #[napi]
    pub fn query_network(&self) -> QueryResultInfo {
        let result = self.inner.query_network();
        query_result_to_info(&result)
    }
}

fn query_result_to_info(result: &nono::query::QueryResult) -> QueryResultInfo {
    match result {
        nono::query::QueryResult::Allowed(reason) => match reason {
            nono::query::AllowReason::GrantedPath {
                granted_path,
                access,
            } => QueryResultInfo {
                status: "allowed".to_string(),
                reason: "granted_path".to_string(),
                granted_path: Some(granted_path.clone()),
                access: Some(access.clone()),
                granted: None,
                requested: None,
            },
            nono::query::AllowReason::NetworkAllowed => QueryResultInfo {
                status: "allowed".to_string(),
                reason: "network_allowed".to_string(),
                granted_path: None,
                access: None,
                granted: None,
                requested: None,
            },
        },
        nono::query::QueryResult::Denied(reason) => match reason {
            nono::query::DenyReason::PathNotGranted => QueryResultInfo {
                status: "denied".to_string(),
                reason: "path_not_granted".to_string(),
                granted_path: None,
                access: None,
                granted: None,
                requested: None,
            },
            nono::query::DenyReason::InsufficientAccess { granted, requested } => QueryResultInfo {
                status: "denied".to_string(),
                reason: "insufficient_access".to_string(),
                granted_path: None,
                access: None,
                granted: Some(granted.clone()),
                requested: Some(requested.clone()),
            },
            nono::query::DenyReason::NetworkBlocked => QueryResultInfo {
                status: "denied".to_string(),
                reason: "network_blocked".to_string(),
                granted_path: None,
                access: None,
                granted: None,
                requested: None,
            },
        },
    }
}

// ---------------------------------------------------------------------------
// Module-level functions
// ---------------------------------------------------------------------------

/// Apply the sandbox with the given capabilities.
///
/// This is irreversible. Once applied, the current process and all children
/// can only access resources granted by the capabilities.
#[napi]
pub fn apply(caps: &JsCapabilitySet) -> Result<()> {
    Sandbox::apply(&caps.inner).map_err(to_napi_err)
}

/// Check if sandboxing is supported on this platform.
#[napi(js_name = "isSupported")]
pub fn is_supported() -> bool {
    Sandbox::is_supported()
}

/// Get detailed information about sandbox support on this platform.
#[napi(js_name = "supportInfo")]
pub fn support_info_fn() -> SupportInfoResult {
    let info = Sandbox::support_info();
    SupportInfoResult {
        is_supported: info.is_supported,
        platform: info.platform.to_string(),
        details: info.details,
    }
}
