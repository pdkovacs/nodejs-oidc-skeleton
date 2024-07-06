include "root" {
  path = find_in_parent_folders()
}

terraform {
  extra_arguments "common_vars" {
    commands = ["plan", "apply", "destroy"]

    arguments = [
      "-var-file=../common.tfvars",
      "-var-file=../vpc.tfvars",
      "-var-file=./nat.tfvars",
    ]
  }
}

dependencies {
  paths = ["../vpc-base"]
}
