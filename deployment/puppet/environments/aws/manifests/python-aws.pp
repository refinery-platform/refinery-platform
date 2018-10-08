class refinery::python-aws {
  python::requirements { $::requirements_aws:
    virtualenv => $::virtualenv,
    owner      => $::app_user,
    group      => $::app_group,
    subscribe => Python::Virtualenv[$::virtualenv],
  }
}