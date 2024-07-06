include "root" {
  path = find_in_parent_folders()
}

terraform {
  extra_arguments "common_vars" {
    commands = ["plan", "apply"]

    arguments = [
      "-var-file=../common.tfvars",
      "-var-file=../ssh.tfvars"
    ]
  }
}
